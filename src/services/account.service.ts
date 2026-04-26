/**
 * Account service handling account creation, listing, detail, and history lookups.
 * Returns Result<T, E> — never throws from business logic.
 * @module services/account
 */

import { randomBytes } from "node:crypto";

import { ObjectId } from "mongodb";

import { type AccountRepository } from "../repositories/account.repository.js";
import { type LedgerEntryRepository } from "../repositories/ledger-entry.repository.js";
import { type CreateAccountInput } from "../schemas/account.schema.js";
import { AccountStatus } from "../domain/enums/account-status.enum.js";
import { env } from "../config/environment.js";
import {
  type Result,
  type AppError,
  success,
  failure,
} from "../utils/result.js";
import { logger } from "../utils/logger.js";

const MAX_ACCOUNT_NUMBER_RETRIES = 3;

interface AccountOutput {
  accountId: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
}

interface AccountDetailOutput extends AccountOutput {
  createdAt: string;
}

interface HistoryEntryOutput {
  entryId: string;
  transactionId: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

interface AccountHistoryOutput {
  entries: HistoryEntryOutput[];
  pagination: {
    page: number;
    limit: number;
    totalEntries: number;
    totalPages: number;
  };
}

class AccountService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly ledgerEntryRepo?: LedgerEntryRepository
  ) {}

  async create(
    userId: string,
    input: CreateAccountInput
  ): Promise<Result<AccountOutput, AppError>> {
    try {
      const userObjectId = new ObjectId(userId);

      // Enforce per-user account limit
      const accountCount = await this.accountRepo.countByUserId(userObjectId);
      if (accountCount >= env.MAX_ACCOUNTS_PER_USER) {
        return failure({
          code: "ACCOUNT_LIMIT_REACHED",
          message: `Maximum of ${env.MAX_ACCOUNTS_PER_USER} accounts per user.`,
          statusCode: 422,
        });
      }

      // Retry on account number collision (unique index)
      for (let attempt = 0; attempt < MAX_ACCOUNT_NUMBER_RETRIES; attempt++) {
        try {
          const accountNumber = generateAccountNumber();
          const now = new Date();

          const account = await this.accountRepo.create({
            userId: userObjectId,
            accountNumber,
            balance: 0,
            currency: input.currency,
            status: AccountStatus.ACTIVE,
            createdAt: now,
            updatedAt: now,
          });

          logger.info(
            { accountId: account._id.toHexString(), userId },
            "Account created"
          );

          return success({
            accountId: account._id.toHexString(),
            accountNumber: account.accountNumber,
            balance: account.balance,
            currency: account.currency,
            status: account.status,
          });
        } catch (error) {
          const isDuplicate =
            error instanceof Error &&
            "code" in error &&
            (error as { code: number }).code === 11000;

          if (!isDuplicate || attempt === MAX_ACCOUNT_NUMBER_RETRIES - 1) {
            throw error;
          }

          logger.warn(
            { attempt: attempt + 1 },
            "Account number collision, retrying"
          );
        }
      }

      return failure({
        code: "ACCOUNT_CREATION_FAILED",
        message: "Failed to generate a unique account number.",
        statusCode: 500,
      });
    } catch (error) {
      logger.error({ err: error }, "Account creation failed");
      return failure({
        code: "ACCOUNT_CREATION_FAILED",
        message: "An unexpected error occurred while creating the account.",
        statusCode: 500,
      });
    }
  }

  async listByUser(userId: string): Promise<Result<AccountOutput[], AppError>> {
    try {
      const accounts = await this.accountRepo.findByUserId(
        new ObjectId(userId)
      );

      const data = accounts.map((account) => ({
        accountId: account._id.toHexString(),
        accountNumber: account.accountNumber,
        balance: account.balance,
        currency: account.currency,
        status: account.status,
      }));

      return success(data);
    } catch (error) {
      logger.error({ err: error }, "Account listing failed");
      return failure({
        code: "ACCOUNT_LIST_FAILED",
        message: "An unexpected error occurred while listing accounts.",
        statusCode: 500,
      });
    }
  }

  async getById(
    accountId: string,
    userId: string
  ): Promise<Result<AccountDetailOutput, AppError>> {
    try {
      const account = await this.accountRepo.findById(
        new ObjectId(accountId)
      );

      if (!account) {
        return failure({
          code: "ACCOUNT_NOT_FOUND",
          message: "Account not found.",
          statusCode: 404,
        });
      }

      if (account.userId.toHexString() !== userId) {
        return failure({
          code: "ACCOUNT_ACCESS_DENIED",
          message: "You do not have access to this account.",
          statusCode: 403,
        });
      }

      return success({
        accountId: account._id.toHexString(),
        accountNumber: account.accountNumber,
        balance: account.balance,
        currency: account.currency,
        status: account.status,
        createdAt: account.createdAt.toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, "Account detail lookup failed");
      return failure({
        code: "ACCOUNT_DETAIL_FAILED",
        message: "An unexpected error occurred while retrieving the account.",
        statusCode: 500,
      });
    }
  }

  async getHistory(
    accountId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<Result<AccountHistoryOutput, AppError>> {
    try {
      const account = await this.accountRepo.findById(
        new ObjectId(accountId)
      );

      if (!account) {
        return failure({
          code: "ACCOUNT_NOT_FOUND",
          message: "Account not found.",
          statusCode: 404,
        });
      }

      if (account.userId.toHexString() !== userId) {
        return failure({
          code: "ACCOUNT_ACCESS_DENIED",
          message: "You do not have access to this account.",
          statusCode: 403,
        });
      }

      const { entries, totalEntries } =
        await this.ledgerEntryRepo!.findByAccountId(
          account._id,
          page,
          limit
        );

      return success({
        entries: entries.map((entry) => ({
          entryId: entry._id.toHexString(),
          transactionId: entry.transactionId.toHexString(),
          entryType: entry.entryType,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          createdAt: entry.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit),
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Account history lookup failed");
      return failure({
        code: "ACCOUNT_HISTORY_FAILED",
        message: "An unexpected error occurred while retrieving account history.",
        statusCode: 500,
      });
    }
  }
}

function generateAccountNumber(): string {
  const bytes = randomBytes(6);
  const num = Array.from(bytes)
    .map((b) => b.toString(10).padStart(3, "0").slice(-3))
    .join("")
    .slice(0, 12);

  return `${num.slice(0, 4)}-${num.slice(4, 8)}-${num.slice(8, 12)}`;
}

export { AccountService };
export type { AccountOutput, AccountDetailOutput, AccountHistoryOutput };
