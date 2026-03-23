/**
 * In-memory MongoDB setup for tests using mongodb-memory-server.
 * Provides a real replica set for transaction support.
 * @module tests/helpers/test-db
 */

import { MongoClient, Db } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet;
let client: MongoClient;
let db: Db;

async function setupTestDb(): Promise<{ client: MongoClient; db: Db }> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  const uri = replSet.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("ledger_test");

  return { client, db };
}

async function teardownTestDb(): Promise<void> {
  if (client) {
    await client.close();
  }
  if (replSet) {
    await replSet.stop();
  }
}

async function clearCollections(): Promise<void> {
  const collections = await db.listCollections().toArray();
  await Promise.all(
    collections.map((col) => db.collection(col.name).deleteMany({}))
  );
}

export { setupTestDb, teardownTestDb, clearCollections };
