/**
 * Ledger entry entity representing a single debit or credit against an account.
 * Append-only: never updated or deleted. Corrections use reversing entries.
 * @module domain/entities/ledger-entry
 */

import { ObjectId } from "mongodb";

import { EntryType } from "../enums/entry-type.enum.js";

interface LedgerEntryDocument {
  _id: ObjectId;
  transactionId: ObjectId;
  accountId: ObjectId;
  entryType: EntryType;
  amount: number;
  balanceAfter: number;
  createdAt: Date;
}

export type { LedgerEntryDocument };
