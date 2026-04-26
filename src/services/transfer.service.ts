/**
 * Transfer service orchestrating P2P transfers with double-entry ledger,
 * AI-powered fraud detection, and transactional integrity.
 *
 * Concurrency model:
 *   1. Pre-read accounts outside transaction for early validation + risk context.
 *   2. Risk assessment outside transaction (external API call, up to 3 s).
 *   3. Inside the transaction: re-read accounts, re-validate, use guarded
 *      balance update ($inc with balance >= guard) to prevent double-spend,
 *      re-check velocity to catch parallel request flooding.
 *
 * @module services/transfer
 */

import { MongoClient, ObjectId } from "mongodb";

import { type AccountRepository } from "../repositories/account.repository.js";
import { type LedgerEntryRepository } from "../repositories/ledger-entry.repository.js";
import { type TransactionRepository } from "../repositories/transaction.repository.js";
import { type IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { type AuditLogRepository } from "../repositories/audit-log.repository.js";
import {
  type RiskAssessmentService,
  type RiskAssessment,
} from "./risk-assessment.service.js";
import { type CreateTransferInput } from "../schemas/transfer.schema.js";
import { AccountStatus } from "../domain/enums/account-status.enum.js";
import { TransactionType } from "../domain/enums/transaction-type.enum.js";
import { TransactionStatus } from "../domain/enums/transaction-status.enum.js";
import { EntryType } from "../domain/enums/entry-type.enum.js";
import { RiskLevel } from "../domain/enums/risk-level.enum.js";
import { AuditAction } from "../domain/enums/audit-action.enum.js";
import {
  type Result,
  type AppError,
  success,
  failure,
} from "../utils/result.js";
import { logger } from "../utils/logger.js";

const MAX_TRANSFERS_PER_HOUR = 30;

interface TransferOutput {
  transactionId: string;
  type: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: string;
  riskAssessment: {
    riskScore: number;
    riskLevel: string;
    flags: string[];
  };
  createdAt: string;
}

class TransferService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly ledgerEntryRepo: LedgerEntryRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly riskService: RiskAssessmentService,
    private readonly client: MongoClient
  ) {}

  async execute(
    userId: string,
    input: CreateTransferInput,
    idempotencyKey: string,
    ip: string,
    userAgent: string
  ): Promise<Result<TransferOutput, AppError>> {
    if (input.fromAccountId === input.toAccountId) {
      return failure({
        code: "SELF_TRANSFER",
        message: "Cannot transfer to the same account.",
        statusCode: 422,
      });
    }

    const fromAccountId = new ObjectId(input.fromAccountId);
    const toAccountId = new ObjectId(input.toAccountId);

    // --- Pre-read for early validation and risk context (outside transaction) ---
    const [fromAccount, toAccount] = await Promise.all([
      this.accountRepo.findById(fromAccountId),
      this.accountRepo.findById(toAccountId),
    ]);

    if (!fromAccount) {
      return failure({
        code: "ACCOUNT_NOT_FOUND",
        message: "Sender account not found.",
        statusCode: 404,
      });
    }

    if (!toAccount) {
      return failure({
        code: "ACCOUNT_NOT_FOUND",
        message: "Recipient account not found.",
        statusCode: 404,
      });
    }

    if (fromAccount.userId.toHexString() !== userId) {
      return failure({
        code: "ACCOUNT_ACCESS_DENIED",
        message: "You do not have access to the sender account.",
        statusCode: 403,
      });
    }

    if (fromAccount.status !== AccountStatus.ACTIVE) {
      return failure({
        code: "ACCOUNT_NOT_ACTIVE",
        message: "Sender account is not active.",
        statusCode: 422,
      });
    }

    if (toAccount.status !== AccountStatus.ACTIVE) {
      return failure({
        code: "TRANSFER_FAILED",
        message: "Transfer could not be completed.",
        statusCode: 422,
      });
    }

    if (fromAccount.currency !== toAccount.currency) {
      return failure({
        code: "CURRENCY_MISMATCH",
        message: "Both accounts must have the same currency.",
        statusCode: 422,
      });
    }

    if (input.currency !== fromAccount.currency) {
      return failure({
        code: "CURRENCY_MISMATCH",
        message: `Transfer currency ${input.currency} does not match account currency ${fromAccount.currency}.`,
        statusCode: 422,
      });
    }

    if (fromAccount.balance < input.amount) {
      return failure({
        code: "INSUFFICIENT_FUNDS",
        message: "Account does not have enough balance for this transfer.",
        statusCode: 422,
      });
    }

    // --- Risk assessment (outside transaction — external API call) ---
    const riskContext = await this.riskService.gatherContext(
      fromAccountId,
      toAccountId,
      input.amount,
      input.currency,
      input.description,
      fromAccount.balance,
      fromAccount.createdAt
    );

    const riskResult = await this.riskService.assess(riskContext);

    if (!riskResult.success) {
      return failure({
        code: "TRANSFER_BLOCKED",
        message: "Transaction blocked: risk assessment service unavailable (fail-safe).",
        statusCode: 403,
      });
    }

    const assessment = riskResult.data;

    if (assessment.riskLevel === "HIGH") {
      return this.blockTransfer(
        userId,
        input,
        idempotencyKey,
        assessment,
        ip,
        userAgent
      );
    }

    // --- Execute inside transaction with full re-validation ---
    return this.executeTransfer(
      userId,
      input,
      fromAccountId,
      toAccountId,
      idempotencyKey,
      assessment,
      ip,
      userAgent
    );
  }

  private async blockTransfer(
    userId: string,
    input: CreateTransferInput,
    idempotencyKey: string,
    assessment: RiskAssessment,
    ip: string,
    userAgent: string
  ): Promise<Result<TransferOutput, AppError>> {
    const session = this.client.startSession();

    try {
      await session.withTransaction(async () => {
        await this.transactionRepo.create(
          {
            type: TransactionType.P2P,
            fromAccountId: new ObjectId(input.fromAccountId),
            toAccountId: new ObjectId(input.toAccountId),
            amount: input.amount,
            currency: input.currency,
            description: input.description,
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel as RiskLevel,
            status: TransactionStatus.BLOCKED,
            idempotencyKey,
            createdAt: new Date(),
          },
          session
        );

        await this.auditLogRepo.create(
          {
            action: AuditAction.BLOCKED,
            userId: new ObjectId(userId),
            metadata: {
              fromAccountId: input.fromAccountId,
              toAccountId: input.toAccountId,
              amount: input.amount,
              currency: input.currency,
              riskScore: assessment.riskScore,
              riskLevel: assessment.riskLevel,
              flags: assessment.flags,
            },
            ip,
            userAgent,
          },
          session
        );
      });

      return failure({
        code: "TRANSFER_BLOCKED",
        message: `Transaction blocked by fraud detection. Risk score: ${assessment.riskScore} (${assessment.riskLevel}).`,
        statusCode: 403,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to record blocked transfer");
      return failure({
        code: "TRANSFER_FAILED",
        message: "An unexpected error occurred while processing the transfer.",
        statusCode: 500,
      });
    } finally {
      await session.endSession();
    }
  }

  private async executeTransfer(
    userId: string,
    input: CreateTransferInput,
    fromAccountId: ObjectId,
    toAccountId: ObjectId,
    idempotencyKey: string,
    assessment: RiskAssessment,
    ip: string,
    userAgent: string
  ): Promise<Result<TransferOutput, AppError>> {
    const session = this.client.startSession();

    try {
      let transferOutput: TransferOutput | undefined;

      await session.withTransaction(async () => {
        // Re-read accounts inside transaction for authoritative state
        const [senderAccount, recipientAccount] = await Promise.all([
          this.accountRepo.findById(fromAccountId, session),
          this.accountRepo.findById(toAccountId, session),
        ]);

        if (
          !senderAccount ||
          !recipientAccount ||
          senderAccount.status !== AccountStatus.ACTIVE ||
          recipientAccount.status !== AccountStatus.ACTIVE
        ) {
          throw new TransactionAbortError("ACCOUNT_INVALID");
        }

        if (senderAccount.balance < input.amount) {
          throw new TransactionAbortError("INSUFFICIENT_FUNDS");
        }

        // Re-check velocity inside transaction to catch parallel flooding
        const recentTransfers = await this.transactionRepo.countRecentByAccount(
          fromAccountId,
          new Date(Date.now() - 3_600_000),
          session
        );

        if (recentTransfers >= MAX_TRANSFERS_PER_HOUR) {
          throw new TransactionAbortError("VELOCITY_EXCEEDED");
        }

        const now = new Date();

        // Guarded balance debit — atomically checks balance >= amount
        const updatedSender = await this.accountRepo.updateBalanceGuarded(
          fromAccountId,
          -input.amount,
          session
        );

        if (!updatedSender) {
          throw new TransactionAbortError("INSUFFICIENT_FUNDS");
        }

        // Credit recipient — get authoritative post-update balance
        const updatedRecipient = await this.accountRepo.updateBalance(
          toAccountId,
          input.amount,
          session
        );

        if (!updatedRecipient) {
          throw new TransactionAbortError("ACCOUNT_INVALID");
        }

        const transaction = await this.transactionRepo.create(
          {
            type: TransactionType.P2P,
            fromAccountId,
            toAccountId,
            amount: input.amount,
            currency: input.currency,
            description: input.description,
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel as RiskLevel,
            status: TransactionStatus.COMPLETED,
            idempotencyKey,
            createdAt: now,
          },
          session
        );

        await this.ledgerEntryRepo.createMany(
          [
            {
              transactionId: transaction._id,
              accountId: fromAccountId,
              entryType: EntryType.DEBIT,
              amount: input.amount,
              balanceAfter: updatedSender.balance,
              createdAt: now,
            },
            {
              transactionId: transaction._id,
              accountId: toAccountId,
              entryType: EntryType.CREDIT,
              amount: input.amount,
              balanceAfter: updatedRecipient.balance,
              createdAt: now,
            },
          ],
          session
        );

        transferOutput = {
          transactionId: transaction._id.toHexString(),
          type: TransactionType.P2P,
          fromAccountId: fromAccountId.toHexString(),
          toAccountId: toAccountId.toHexString(),
          amount: input.amount,
          currency: input.currency,
          status: TransactionStatus.COMPLETED,
          riskAssessment: {
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel,
            flags: assessment.flags,
          },
          createdAt: now.toISOString(),
        };

        await this.idempotencyRepo.create(
          {
            key: idempotencyKey,
            userId: new ObjectId(userId),
            method: "POST",
            path: "/api/v1/transfers",
            statusCode: 201,
            responseBody: JSON.stringify({
              success: true,
              data: transferOutput,
            }),
          },
          session
        );

        const auditAction =
          assessment.riskLevel === "MEDIUM"
            ? AuditAction.TRANSFER_FLAGGED
            : AuditAction.TRANSFER;

        await this.auditLogRepo.create(
          {
            action: auditAction,
            userId: new ObjectId(userId),
            metadata: {
              transactionId: transaction._id.toHexString(),
              fromAccountId: fromAccountId.toHexString(),
              toAccountId: toAccountId.toHexString(),
              amount: input.amount,
              currency: input.currency,
              riskScore: assessment.riskScore,
              riskLevel: assessment.riskLevel,
              flags: assessment.flags,
              ...(assessment.riskLevel === "MEDIUM" && {
                flaggedForReview: true,
              }),
            },
            ip,
            userAgent,
          },
          session
        );
      });

      logger.info(
        {
          transactionId: transferOutput!.transactionId,
          userId,
          riskLevel: assessment.riskLevel,
        },
        "Transfer completed"
      );

      return success(transferOutput!);
    } catch (error) {
      if (error instanceof TransactionAbortError) {
        switch (error.reason) {
          case "INSUFFICIENT_FUNDS":
            return failure({
              code: "INSUFFICIENT_FUNDS",
              message: "Account does not have enough balance for this transfer.",
              statusCode: 422,
            });
          case "VELOCITY_EXCEEDED":
            return failure({
              code: "VELOCITY_EXCEEDED",
              message: "Too many transfers in a short period. Please try again later.",
              statusCode: 429,
            });
          default:
            return failure({
              code: "TRANSFER_FAILED",
              message: "Transfer could not be completed.",
              statusCode: 422,
            });
        }
      }

      logger.error({ err: error }, "Transfer failed");
      return failure({
        code: "TRANSFER_FAILED",
        message: "An unexpected error occurred while processing the transfer.",
        statusCode: 500,
      });
    } finally {
      await session.endSession();
    }
  }
}

class TransactionAbortError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export { TransferService };
export type { TransferOutput };
