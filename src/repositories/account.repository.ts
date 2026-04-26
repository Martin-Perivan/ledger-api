/**
 * Repository for the accounts collection.
 * Handles account creation, lookups, balance updates, and ownership queries.
 * @module repositories/account
 */

import { Collection, Db, ObjectId, ClientSession, ReturnDocument } from "mongodb";

import { type AccountDocument } from "../domain/entities/account.entity.js";

class AccountRepository {
  private collection: Collection<AccountDocument>;

  constructor(db: Db) {
    this.collection = db.collection<AccountDocument>("accounts");
  }

  async findById(
    id: ObjectId,
    session?: ClientSession
  ): Promise<AccountDocument | null> {
    return this.collection.findOne({ _id: id }, { session });
  }

  async findByAccountNumber(
    accountNumber: string,
    session?: ClientSession
  ): Promise<AccountDocument | null> {
    return this.collection.findOne(
      { accountNumber: { $eq: accountNumber } },
      { session }
    );
  }

  async findByUserId(
    userId: ObjectId,
    session?: ClientSession
  ): Promise<AccountDocument[]> {
    return this.collection.find({ userId: { $eq: userId } }, { session }).toArray();
  }

  async create(
    data: Omit<AccountDocument, "_id">,
    session?: ClientSession
  ): Promise<AccountDocument> {
    const result = await this.collection.insertOne(
      data as AccountDocument,
      { session }
    );

    return { ...data, _id: result.insertedId } as AccountDocument;
  }

  async updateBalance(
    id: ObjectId,
    balanceDelta: number,
    session?: ClientSession
  ): Promise<AccountDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: id },
      {
        $inc: { balance: balanceDelta },
        $set: { updatedAt: new Date() },
      },
      { session, returnDocument: ReturnDocument.AFTER }
    );
  }

  async updateBalanceGuarded(
    id: ObjectId,
    balanceDelta: number,
    session?: ClientSession
  ): Promise<AccountDocument | null> {
    const filter: Record<string, unknown> = { _id: id };

    if (balanceDelta < 0) {
      filter["balance"] = { $gte: Math.abs(balanceDelta) };
    }

    return this.collection.findOneAndUpdate(
      filter,
      {
        $inc: { balance: balanceDelta },
        $set: { updatedAt: new Date() },
      },
      { session, returnDocument: ReturnDocument.AFTER }
    );
  }

  async countByUserId(
    userId: ObjectId,
    session?: ClientSession
  ): Promise<number> {
    return this.collection.countDocuments(
      { userId: { $eq: userId } },
      { session }
    );
  }
}

export { AccountRepository };
