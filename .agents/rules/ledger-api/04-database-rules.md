---
trigger: always_on
---

# Rule: Database Rules

## MongoDB Native Driver

This project uses the **MongoDB Node.js native driver** (`mongodb` package), NOT Mongoose. Reasons:

- Full control over queries and aggregations.
- No ORM overhead for a project that needs precise transactional control.
- Typed with TypeScript generics (`Collection<T>`).
- Aligns with how production fintech systems interact with MongoDB.

## Connection

- Use a single `MongoClient` instance, initialized at app startup.
- Connection string from `MONGODB_URI` environment variable.
- Database name from `DATABASE_NAME` environment variable.
- Initialize `MongoClient` with `{ readConcern: { level: "local" }, writeConcern: { w: "majority", j: true }, connectTimeoutMS: 10_000, serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 }` for financial durability and connection resilience.
- `retryWrites` is enabled by default in the driver; declare it explicitly in `MONGODB_URI` for clarity.

## Transactions

- All financial operations (transfers, deposits) MUST run inside `session.withTransaction()`.
- The session is created from `client.startSession()` and passed to every repository method within the transaction.
- Repository methods MUST accept an optional `session?: ClientSession` parameter:

```typescript
async findById(id: ObjectId, session?: ClientSession): Promise<AccountDocument | null> {
  return this.collection.findOne({ _id: id }, { session });
}
```

## Amounts

- All monetary amounts are stored as **integers in cents** (e.g., `$100.00 MXN` = `10000`).
- Never use `float`, `double`, or `Decimal128` for amounts in this project.
- The `Money` value object enforces this at the domain level.
- Currency codes follow ISO 4217 (e.g., `MXN`, `USD`).

## Indexes

- Create indexes programmatically at app startup via a `createIndexes()` function in `src/config/database.ts`.
- Use `createIndex()` with `{ background: true }` for non-blocking index creation.
- All unique indexes must handle duplicate key errors gracefully (catch error code `11000`).

## Append-Only Collections

The following collections are **append-only** — no updates or deletes are allowed:

- `ledgerEntries` — financial entries are immutable.
- `auditLogs` — audit trail is immutable.

Repository classes for these collections MUST NOT expose `update` or `delete` methods.

## Document Structure

- Every document MUST include `createdAt: Date` (set on insert).
- Mutable documents MUST include `updatedAt: Date` (set on insert and update).
- Use `new Date()` for timestamps, not `Date.now()` (MongoDB stores `Date` objects natively).
- Use `new ObjectId()` for generated IDs, not string UUIDs (better performance, smaller storage).

## Query Patterns

- Always project only the fields you need: `{ projection: { passwordHash: 0 } }`.
- Use compound indexes for queries that filter + sort (e.g., `{ accountId: 1, createdAt: -1 }` for ledger history).
- Pagination: use `skip` + `limit` for simplicity in MVP. Note: for large datasets, cursor-based pagination is preferred (roadmap).