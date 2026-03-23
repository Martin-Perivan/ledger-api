/**
 * Tests for the transfer service — validates P2P transfer logic,
 * business rules, and double-entry mechanics.
 * @module tests/unit/transfer.service
 */

import { ObjectId, Db, MongoClient } from "mongodb";

import { TransferService } from "../../src/services/transfer.service.js";
import { AccountRepository } from "../../src/repositories/account.repository.js";
import { LedgerEntryRepository } from "../../src/repositories/ledger-entry.repository.js";
import { TransactionRepository } from "../../src/repositories/transaction.repository.js";
import { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";
import { AuditLogRepository } from "../../src/repositories/audit-log.repository.js";
import { RiskAssessmentService } from "../../src/services/risk-assessment.service.js";
import { AccountStatus } from "../../src/domain/enums/account-status.enum.js";
import { EntryType } from "../../src/domain/enums/entry-type.enum.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/test-db.js";

let db: Db;
let client: MongoClient;
let transferService: TransferService;
let accountRepo: AccountRepository;
let ledgerEntryRepo: LedgerEntryRepository;

const USER_A_ID = new ObjectId();
const USER_B_ID = new ObjectId();

beforeAll(async () => {
  ({ client, db } = await setupTestDb());

  accountRepo = new AccountRepository(db);
  ledgerEntryRepo = new LedgerEntryRepository(db);
  const transactionRepo = new TransactionRepository(db);
  const idempotencyRepo = new IdempotencyRepository(db);
  const auditLogRepo = new AuditLogRepository(db);
  const riskService = new RiskAssessmentService(transactionRepo);

  transferService = new TransferService(
    accountRepo,
    ledgerEntryRepo,
    transactionRepo,
    idempotencyRepo,
    auditLogRepo,
    riskService,
    client
  );
}, 30_000);

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();
});

async function createAccount(
  userId: ObjectId,
  balance: number,
  currency = "MXN",
  status = AccountStatus.ACTIVE
): Promise<ObjectId> {
  const account = await accountRepo.create({
    userId,
    accountNumber: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    balance,
    currency,
    status,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(),
  });
  return account._id;
}

describe("TransferService", () => {
  describe("validation rules", () => {
    it("should reject self-transfers", async () => {
      const accountId = await createAccount(USER_A_ID, 100000);
      const hex = accountId.toHexString();

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: hex,
          toAccountId: hex,
          amount: 5000,
          currency: "MXN",
          description: "Self transfer",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SELF_TRANSFER");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("should reject if sender account not found", async () => {
      const toAccountId = await createAccount(USER_B_ID, 0);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: new ObjectId().toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
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
      }
    });

    it("should reject if user does not own the sender account", async () => {
      const fromAccountId = await createAccount(USER_B_ID, 100000);
      const toAccountId = await createAccount(USER_A_ID, 0);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
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

    it("should reject if sender account is not active", async () => {
      const fromAccountId = await createAccount(USER_A_ID, 100000, "MXN", AccountStatus.FROZEN);
      const toAccountId = await createAccount(USER_B_ID, 0);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCOUNT_NOT_ACTIVE");
      }
    });

    it("should reject if currencies do not match", async () => {
      const fromAccountId = await createAccount(USER_A_ID, 100000, "MXN");
      const toAccountId = await createAccount(USER_B_ID, 0, "USD");

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CURRENCY_MISMATCH");
      }
    });

    it("should reject if insufficient funds", async () => {
      const fromAccountId = await createAccount(USER_A_ID, 3000);
      const toAccountId = await createAccount(USER_B_ID, 0);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
        expect(result.error.statusCode).toBe(422);
      }
    });
  });

  describe("successful transfer (low risk)", () => {
    it("should complete transfer and update both balances", async () => {
      const fromAccountId = await createAccount(USER_A_ID, 100000);
      const toAccountId = await createAccount(USER_B_ID, 20000);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 10000,
          currency: "MXN",
          description: "Payment for dinner",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.type).toBe("P2P");
      expect(result.data.status).toBe("COMPLETED");
      expect(result.data.amount).toBe(10000);
      expect(result.data.riskAssessment).toBeDefined();

      const senderAccount = await accountRepo.findById(fromAccountId);
      const recipientAccount = await accountRepo.findById(toAccountId);

      expect(senderAccount!.balance).toBe(90000);
      expect(recipientAccount!.balance).toBe(30000);
    });

    it("should create DEBIT and CREDIT ledger entries", async () => {
      const fromAccountId = await createAccount(USER_A_ID, 50000);
      const toAccountId = await createAccount(USER_B_ID, 10000);

      const result = await transferService.execute(
        USER_A_ID.toHexString(),
        {
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: 5000,
          currency: "MXN",
          description: "Test",
        },
        crypto.randomUUID(),
        "127.0.0.1",
        "jest"
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const txId = new ObjectId(result.data.transactionId);
      const entries = await ledgerEntryRepo.findByTransactionId(txId);

      expect(entries).toHaveLength(2);

      const debit = entries.find((e) => e.entryType === EntryType.DEBIT)!;
      const credit = entries.find((e) => e.entryType === EntryType.CREDIT)!;

      expect(debit.accountId.toHexString()).toBe(fromAccountId.toHexString());
      expect(debit.amount).toBe(5000);
      expect(debit.balanceAfter).toBe(45000);

      expect(credit.accountId.toHexString()).toBe(toAccountId.toHexString());
      expect(credit.amount).toBe(5000);
      expect(credit.balanceAfter).toBe(15000);
    });
  });
});
