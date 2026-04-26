/**
 * Idempotency key entity for deduplicating state-changing financial operations.
 * Stored with a TTL index (24h) for automatic cleanup.
 * @module domain/entities/idempotency-key
 */

import { ObjectId } from "mongodb";

interface IdempotencyKeyDocument {
  _id: ObjectId;
  key: string;
  userId: ObjectId;
  method: string;
  path: string;
  statusCode: number;
  responseBody: string;
  createdAt: Date;
  expiresAt: Date;
}

export type { IdempotencyKeyDocument };
