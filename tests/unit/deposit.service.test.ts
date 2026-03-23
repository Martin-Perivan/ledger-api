/**
 * Tests for the deposit service — validates double-entry ledger mechanics.
 * Uses in-memory MongoDB replica set for transactional integrity.
 * @module tests/unit/deposit.service
 */

import { ObjectId, Db, MongoClient } from "mongodb";

import { DepositService } from "../../src/services/deposit.service.js";
import { AccountRepository } from "../../src/repositories/account.repository.js";
import { LedgerEntryRepository } from "../../src/repositories/ledger-entry.repository.js";
import { TransactionRepository } from "../../src/repositories/transaction.repository.js";
import { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";
import { AuditLogRepository } from "../../src/repositories/audit-log.repository.js";
import { AccountStatus } from "../../src/domain/enums/account-status.enum.js";
import { EntryType } from "../../src/domain/enums/entry-type.enum.js";
import { EXTERNAL_ACCOUNT_ID } from "../../src/domain/constants.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/test-db.js";

let db: Db;
let client: MongoClient;
let depositService: DepositService;
let accountRepo: AccountRepository;
let ledgerEntryRepo: LedgerEntryRepository;
let transactionRepo: TransactionRepository;

const TEST_USER_ID = new ObjectId();

beforeAll(async () => {
  ({ client, db } = await setupTestDb());

  accountRepo = new AccountRepository(db);
  ledgerEntryRepo = new LedgerEntryRepository(db);
  transactionRepo = new TransactionRepository(db);
  const idempotencyRepo = new IdempotencyRepository(db);
  const auditLogRepo = new AuditLogRepository(db);

  depositService = new DepositService(
    accountRepo,
    ledgerEntryRepo,
    transactionRepo,
    idempotencyRepo,
    auditLogRepo,
    client
  );
}, 30_000);

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();
});

async function createTestAccount(
  balance = 0,
  currency = "MXN"
): Promise<{ _id: ObjectId; accountNumber: string }> {
  const account = await accountRepo.create({
    userId: TEST_USER_ID,
    accountNumber: `TEST-${Date.now()}`,
    balance,
    currency,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id: account._id, accountNumber: account.accountNumber };
}

describe("DepositService", () => {
  describe("successful deposit", () => {
    it("should create a deposit transaction with COMPLETED status", async () => {
      const account = await createTestAccount();

      const result = await depositService.execute(
        TEST_USER_ID.toHexString(),
        {
          accountId: account._id.toHexString(),
          amount: 50000,
          currency: "MXN",
          description: "Initial funding",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("DEPOSIT");
        expect(result.data.amount).toBe(50000);
        expect(result.data.status).toBe("COMPLETED");
      }
    });

    it("should create exactly two ledger entries (DEBIT external + CREDIT account)", async () => {
      const account = await createTestAccount();

      const result = await depositService.execute(
        TEST_USER_ID.toHexString(),
        {
          accountId: account._id.toHexString(),
          amount: 25000,
          currency: "MXN",
          description: "Test deposit",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const transactionId = new ObjectId(result.data.transactionId);
      const entries = await ledgerEntryRepo.findByTransactionId(transactionId);

      expect(entries).toHaveLength(2);

      const debitEntry = entries.find((e) => e.entryType === EntryType.DEBIT);
      const creditEntry = entries.find((e) => e.entryType === EntryType.CREDIT);

      expect(debitEntry).toBeDefined();
      expect(debitEntry!.accountId.toHexString()).toBe(EXTERNAL_ACCOUNT_ID.toHexString());
      expect(debitEntry!.amount).toBe(25000);

      expect(creditEntry).toBeDefined();
      expect(creditEntry!.accountId.toHexString()).toBe(account._id.toHexString());
      expect(creditEntry!.amount).toBe(25000);
      expect(creditEntry!.balanceAfter).toBe(25000);
    });

    it("should update the account balance after deposit", async () => {
      const account = await createTestAccount(10000);

      await depositService.execute(
        TEST_USER_ID.toHexString(),
        {
          accountId: account._id.toHexString(),
          amount: 30000,
          currency: "MXN",
          description: "Top up",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      const updatedAccount = await accountRepo.findById(account._id);
      expect(updatedAccount!.balance).toBe(40000);
    });
  });

  describe("validation failures", () => {
    it("should fail if account does not exist", async () => {
      const fakeId = new ObjectId();
      const result = await depositService.execute(
        TEST_USER_ID.toHexString(),
        {
          accountId: fakeId.toHexString(),
          amount: 10000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
        expect(result.error.statusCode).toBe(404);
      }
    });

    it("should fail if user does not own the account", async () => {
      const account = await createTestAccount();
      const otherUserId = new ObjectId();

      const result = await depositService.execute(
        otherUserId.toHexString(),
        {
          accountId: account._id.toHexString(),
          amount: 10000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCOUNT_ACCESS_DENIED");
        expect(result.error.statusCode).toBe(403);
      }
    });

    it("should fail if currency does not match the account", async () => {
      const account = await createTestAccount(0, "MXN");

      const result = await depositService.execute(
        TEST_USER_ID.toHexString(),
        {
          accountId: account._id.toHexString(),
          amount: 10000,
          currency: "USD",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CURRENCY_MISMATCH");
        expect(result.error.statusCode).toBe(422);
      }
    });
  });
});
