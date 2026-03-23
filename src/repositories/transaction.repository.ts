/**
 * Repository for the transactions collection.
 * Provides creation, lookups, and aggregate queries for risk assessment context.
 * @module repositories/transaction
 */

import { Collection, Db, ObjectId, ClientSession } from "mongodb";

import { type TransactionDocument } from "../domain/entities/transaction.entity.js";

class TransactionRepository {
  private collection: Collection<TransactionDocument>;

  constructor(db: Db) {
    this.collection = db.collection<TransactionDocument>("transactions");
  }

  async create(
    data: Omit<TransactionDocument, "_id">,
    session?: ClientSession
  ): Promise<TransactionDocument> {
    const result = await this.collection.insertOne(
      data as TransactionDocument,
      { session }
    );

    return { ...data, _id: result.insertedId } as TransactionDocument;
  }

  async findById(
    id: ObjectId,
    session?: ClientSession
  ): Promise<TransactionDocument | null> {
    return this.collection.findOne({ _id: id }, { session });
  }

  async findByIdempotencyKey(
    key: string,
    session?: ClientSession
  ): Promise<TransactionDocument | null> {
    return this.collection.findOne(
      { idempotencyKey: { $eq: key } },
      { session }
    );
  }

  async countByAccount(
    accountId: ObjectId,
    session?: ClientSession
  ): Promise<number> {
    return this.collection.countDocuments(
      { fromAccountId: { $eq: accountId } },
      { session }
    );
  }

  async averageAmountByAccount(
    accountId: ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const pipeline = [
      { $match: { fromAccountId: { $eq: accountId } } },
      { $group: { _id: null, avgAmount: { $avg: "$amount" } } },
    ];

    const results = await this.collection
      .aggregate<{ avgAmount: number }>(pipeline, { session })
      .toArray();

    const first = results[0];
    return first ? Math.round(first.avgAmount) : 0;
  }

  async countRecentByAccount(
    accountId: ObjectId,
    since: Date,
    session?: ClientSession
  ): Promise<number> {
    return this.collection.countDocuments(
      {
        fromAccountId: { $eq: accountId },
        createdAt: { $gte: since },
      },
      { session }
    );
  }

  async countByAccountPair(
    fromAccountId: ObjectId,
    toAccountId: ObjectId,
    session?: ClientSession
  ): Promise<number> {
    return this.collection.countDocuments(
      {
        fromAccountId: { $eq: fromAccountId },
        toAccountId: { $eq: toAccountId },
      },
      { session }
    );
  }
}

export { TransactionRepository };
