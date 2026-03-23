/**
 * Repository for the ledgerEntries collection.
 * Append-only: exposes create and query methods only — no update or delete.
 * @module repositories/ledger-entry
 */

import { Collection, Db, ObjectId, ClientSession } from "mongodb";

import { type LedgerEntryDocument } from "../domain/entities/ledger-entry.entity.js";

interface PaginatedEntries {
  entries: LedgerEntryDocument[];
  totalEntries: number;
}

class LedgerEntryRepository {
  private collection: Collection<LedgerEntryDocument>;

  constructor(db: Db) {
    this.collection = db.collection<LedgerEntryDocument>("ledgerEntries");
  }

  async create(
    data: Omit<LedgerEntryDocument, "_id">,
    session?: ClientSession
  ): Promise<LedgerEntryDocument> {
    const result = await this.collection.insertOne(
      data as LedgerEntryDocument,
      { session }
    );

    return { ...data, _id: result.insertedId } as LedgerEntryDocument;
  }

  async createMany(
    entries: Omit<LedgerEntryDocument, "_id">[],
    session?: ClientSession
  ): Promise<void> {
    await this.collection.insertMany(
      entries as LedgerEntryDocument[],
      { session }
    );
  }

  async findByAccountId(
    accountId: ObjectId,
    page: number,
    limit: number,
    session?: ClientSession
  ): Promise<PaginatedEntries> {
    const filter = { accountId: { $eq: accountId } };

    const [entries, totalEntries] = await Promise.all([
      this.collection
        .find(filter, { session })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter, { session }),
    ]);

    return { entries, totalEntries };
  }

  async findByTransactionId(
    transactionId: ObjectId,
    session?: ClientSession
  ): Promise<LedgerEntryDocument[]> {
    return this.collection
      .find({ transactionId: { $eq: transactionId } }, { session })
      .toArray();
  }
}

export { LedgerEntryRepository };
export type { PaginatedEntries };
