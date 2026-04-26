/**
 * Deposit service handling fund deposits into accounts.
 * Creates a DEPOSIT transaction with double-entry ledger entries inside a MongoDB transaction.
 * Uses findOneAndUpdate to get authoritative post-update balance for ledger entries.
 * @module services/deposit
 */

import { MongoClient, ObjectId } from "mongodb";

import { type AccountRepository } from "../repositories/account.repository.js";
import { type LedgerEntryRepository } from "../repositories/ledger-entry.repository.js";
import { type TransactionRepository } from "../repositories/transaction.repository.js";
import { type IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { type AuditLogRepository } from "../repositories/audit-log.repository.js";
import { type CreateDepositInput } from "../schemas/deposit.schema.js";
import { AccountStatus } from "../domain/enums/account-status.enum.js";
import { TransactionType } from "../domain/enums/transaction-type.enum.js";
import { TransactionStatus } from "../domain/enums/transaction-status.enum.js";
import { EntryType } from "../domain/enums/entry-type.enum.js";
import { RiskLevel } from "../domain/enums/risk-level.enum.js";
import { AuditAction } from "../domain/enums/audit-action.enum.js";
import { EXTERNAL_ACCOUNT_ID } from "../domain/constants.js";
import {
  type Result,
  type AppError,
  success,
  failure,
} from "../utils/result.js";
import { logger } from "../utils/logger.js";

interface DepositOutput {
  transactionId: string;
  type: string;
  accountId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

class DepositService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly ledgerEntryRepo: LedgerEntryRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly client: MongoClient
  ) {}

  async execute(
    userId: string,
    input: CreateDepositInput,
    idempotencyKey: string,
    ip: string,
    userAgent: string
  ): Promise<Result<DepositOutput, AppError>> {
    const session = this.client.startSession();

    try {
      let depositOutput: DepositOutput | undefined;

      await session.withTransaction(async () => {
        const account = await this.accountRepo.findById(
          new ObjectId(input.accountId),
          session
        );

        if (!account) {
          throw new ServiceError({
            code: "ACCOUNT_NOT_FOUND",
            message: "Account not found.",
            statusCode: 404,
          });
        }

        if (account.userId.toHexString() !== userId) {
          throw new ServiceError({
            code: "ACCOUNT_ACCESS_DENIED",
            message: "You do not have access to this account.",
            statusCode: 403,
          });
        }

        if (account.status !== AccountStatus.ACTIVE) {
          throw new ServiceError({
            code: "ACCOUNT_NOT_ACTIVE",
            message: "Account is not active.",
            statusCode: 422,
          });
        }

        if (input.currency !== account.currency) {
          throw new ServiceError({
            code: "CURRENCY_MISMATCH",
            message: `Account currency is ${account.currency}, but deposit currency is ${input.currency}.`,
            statusCode: 422,
          });
        }

        const now = new Date();

        const transaction = await this.transactionRepo.create(
          {
            type: TransactionType.DEPOSIT,
            fromAccountId: null,
            toAccountId: account._id,
            amount: input.amount,
            currency: input.currency,
            description: input.description,
            riskScore: 0,
            riskLevel: RiskLevel.LOW,
            status: TransactionStatus.COMPLETED,
            idempotencyKey,
            createdAt: now,
          },
          session
        );

        // Use findOneAndUpdate to get authoritative post-update balance
        const updatedAccount = await this.accountRepo.updateBalance(
          account._id,
          input.amount,
          session
        );

        if (!updatedAccount) {
          throw new ServiceError({
            code: "DEPOSIT_FAILED",
            message: "Failed to update account balance.",
            statusCode: 500,
          });
        }

        await this.ledgerEntryRepo.createMany(
          [
            {
              transactionId: transaction._id,
              accountId: EXTERNAL_ACCOUNT_ID,
              entryType: EntryType.DEBIT,
              amount: input.amount,
              balanceAfter: 0,
              createdAt: now,
            },
            {
              transactionId: transaction._id,
              accountId: account._id,
              entryType: EntryType.CREDIT,
              amount: input.amount,
              balanceAfter: updatedAccount.balance,
              createdAt: now,
            },
          ],
          session
        );

        depositOutput = {
          transactionId: transaction._id.toHexString(),
          type: TransactionType.DEPOSIT,
          accountId: account._id.toHexString(),
          amount: input.amount,
          currency: input.currency,
          status: TransactionStatus.COMPLETED,
          createdAt: now.toISOString(),
        };

        await this.idempotencyRepo.create(
          {
            key: idempotencyKey,
            userId: new ObjectId(userId),
            method: "POST",
            path: "/api/v1/deposits",
            statusCode: 201,
            responseBody: JSON.stringify({
              success: true,
              data: depositOutput,
            }),
          },
          session
        );

        await this.auditLogRepo.create(
          {
            action: AuditAction.DEPOSIT,
            userId: new ObjectId(userId),
            metadata: {
              transactionId: transaction._id.toHexString(),
              accountId: account._id.toHexString(),
              amount: input.amount,
              currency: input.currency,
            },
            ip,
            userAgent,
          },
          session
        );
      });

      logger.info(
        { transactionId: depositOutput!.transactionId, userId },
        "Deposit completed"
      );

      return success(depositOutput!);
    } catch (error) {
      if (error instanceof ServiceError) {
        return failure(error.appError);
      }

      logger.error({ err: error }, "Deposit failed");
      return failure({
        code: "DEPOSIT_FAILED",
        message: "An unexpected error occurred while processing the deposit.",
        statusCode: 500,
      });
    } finally {
      await session.endSession();
    }
  }
}

class ServiceError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.message);
  }
}

export { DepositService };
export type { DepositOutput };
