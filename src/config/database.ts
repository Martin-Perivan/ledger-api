/**
 * MongoDB connection management and index creation.
 * Provides a single MongoClient instance and a session factory for transactions.
 * @module config/database
 */

import { MongoClient, Db } from "mongodb";

import { env } from "./environment.js";
import { logger } from "../utils/logger.js";

let client: MongoClient;
let db: Db;

const FINANCIAL_DB_OPTIONS = {
  readConcern: { level: "local" as const },
  writeConcern: { w: "majority" as const, j: true },
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 10,
};

async function connectDatabase(): Promise<{ client: MongoClient; db: Db }> {
  client = new MongoClient(env.MONGODB_URI, FINANCIAL_DB_OPTIONS);
  await client.connect();

  db = client.db(env.DATABASE_NAME);

  await client.db("admin").command({ ping: 1 });
  logger.info("Connected to MongoDB");

  await createIndexes(db);

  return { client, db };
}

async function createIndexes(db: Db): Promise<void> {
  await Promise.all([
    db
      .collection("users")
      .createIndex({ email: 1 }, { unique: true, background: true }),

    db
      .collection("accounts")
      .createIndex({ userId: 1 }, { background: true }),
    db
      .collection("accounts")
      .createIndex({ accountNumber: 1 }, { unique: true, background: true }),

    db
      .collection("ledgerEntries")
      .createIndex({ accountId: 1, createdAt: -1 }, { background: true }),
    db
      .collection("ledgerEntries")
      .createIndex({ transactionId: 1 }, { background: true }),

    db
      .collection("transactions")
      .createIndex(
        { idempotencyKey: 1 },
        { unique: true, background: true }
      ),
    db
      .collection("transactions")
      .createIndex(
        { fromAccountId: 1, createdAt: -1 },
        { background: true }
      ),

    db
      .collection("idempotencyKeys")
      .createIndex({ key: 1 }, { unique: true, background: true }),
    db
      .collection("idempotencyKeys")
      .createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, background: true }
      ),

    db
      .collection("auditLogs")
      .createIndex({ userId: 1, createdAt: -1 }, { background: true }),
  ]);

  logger.info("Database indexes created");
}

async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    logger.info("Disconnected from MongoDB");
  }
}

export { connectDatabase, disconnectDatabase };
