/**
 * Repository for the idempotencyKeys collection.
 * Stores cached responses with a 24-hour TTL for automatic cleanup.
 * @module repositories/idempotency
 */

import { Collection, Db, ObjectId, ClientSession } from "mongodb";

import { type IdempotencyKeyDocument } from "../domain/entities/idempotency-key.entity.js";

const TTL_HOURS = 24;

class IdempotencyRepository {
  private collection: Collection<IdempotencyKeyDocument>;

  constructor(db: Db) {
    this.collection = db.collection<IdempotencyKeyDocument>("idempotencyKeys");
  }

  async findByKeyAndUser(
    key: string,
    userId: ObjectId,
    session?: ClientSession
  ): Promise<IdempotencyKeyDocument | null> {
    return this.collection.findOne(
      { key: { $eq: key }, userId: { $eq: userId } },
      { session }
    );
  }

  async create(
    data: {
      key: string;
      userId: ObjectId;
      method: string;
      path: string;
      statusCode: number;
      responseBody: string;
    },
    session?: ClientSession
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_HOURS * 60 * 60 * 1000);

    await this.collection.insertOne(
      {
        _id: new ObjectId(),
        key: data.key,
        userId: data.userId,
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        responseBody: data.responseBody,
        createdAt: now,
        expiresAt,
      },
      { session }
    );
  }
}

export { IdempotencyRepository };
