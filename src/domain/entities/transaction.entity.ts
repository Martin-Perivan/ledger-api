/**
 * Transaction entity representing a financial operation (P2P transfer or deposit).
 * Immutable once created — status is set at creation time.
 * @module domain/entities/transaction
 */

import { ObjectId } from "mongodb";

import { TransactionType } from "../enums/transaction-type.enum.js";
import { TransactionStatus } from "../enums/transaction-status.enum.js";
import { RiskLevel } from "../enums/risk-level.enum.js";

interface TransactionDocument {
  _id: ObjectId;
  type: TransactionType;
  fromAccountId: ObjectId | null;
  toAccountId: ObjectId;
  amount: number;
  currency: string;
  description: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: TransactionStatus;
  idempotencyKey: string;
  createdAt: Date;
}

export type { TransactionDocument };
