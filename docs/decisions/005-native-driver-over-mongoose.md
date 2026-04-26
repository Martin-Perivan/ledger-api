# ADR-005: MongoDB Native Driver over Mongoose

## Status
Accepted

## Context
The project needs a MongoDB client library for Node.js. The two main options are:

1. **Mongoose**: ODM (Object Document Mapper) with schemas, validation, middleware hooks, virtuals, and population. The most popular MongoDB library for Node.js.
2. **MongoDB Native Driver** (`mongodb` package): The official low-level driver maintained by MongoDB Inc. Provides direct access to all MongoDB operations with TypeScript generics.

## Decision
Use the **MongoDB Native Driver** (`mongodb` ^6.x) with TypeScript generics for all database operations.

## Rationale

### 1. Transaction Safety
This project relies on multi-document ACID transactions for every financial operation. Mongoose middleware hooks (`pre save`, `post save`, `pre validate`) can execute queries outside the active session without explicit configuration, silently breaking transaction atomicity. The native driver gives us full control — every operation explicitly receives a `ClientSession` parameter, and nothing runs outside it.

### 2. Query Precision
A financial ledger requires specific MongoDB operations:
- `$inc` for atomic balance updates (not `save()` which does a full document replace).
- Aggregation pipelines for computing average transfer amounts and transaction counts.
- `countDocuments` with date range filters for velocity checks.
- Compound index hints for optimized ledger history queries.

The native driver maps 1:1 to MongoDB operations. There is no abstraction layer that might transform or optimize queries in unexpected ways.

### 3. TypeScript Integration
The native driver's `Collection<T>` generic provides clean type inference:
```typescript
const collection = db.collection<AccountDocument>("accounts");
const account = await collection.findOne({ _id: id }); // typed as AccountDocument | null
```
Mongoose requires dual schema definitions (Mongoose schema + TypeScript interface) or inference utilities like `InferSchemaType`, adding complexity without benefit when Zod already handles input validation.

### 4. No Redundant Validation
Input validation is handled by Zod schemas in the middleware layer (before data reaches the repository). Adding Mongoose schema validation at the data layer would be redundant — validating the same data twice with two different libraries.

### 5. Performance
For paginated endpoints like `/accounts/:accountId/history` that return 20-100 ledger entries, additional ODM hydration is unnecessary overhead. The native MongoDB driver returns plain typed objects rather than hydrated model instances.

### 6. Transparency
In a financial system, it is critical to know exactly what queries are executed against the database. The native driver provides this transparency — what you write is what runs. There are no hidden hooks, no automatic population, no implicit saves.

## Trade-offs

- **More boilerplate**: Without Mongoose's model abstraction, we write repository classes manually. This is mitigated by the Repository Pattern, which provides a clean abstraction.
- **No built-in schema enforcement at DB level**: Mitigated by Zod validation on input and MongoDB's own JSON Schema validation (can be added per collection if needed).
- **No `populate()`**: We don't need cross-collection joins. The ledger is designed to be queried by collection — not across collections. When we need related data, we make explicit queries.

## Consequences

- All database operations go through repository classes that accept `Collection<T>` and optional `ClientSession`.
- Developers must pass `session` explicitly to every operation inside a transaction — this is intentional, not a burden.
- Index creation is done programmatically at app startup, not via Mongoose schema definitions.
