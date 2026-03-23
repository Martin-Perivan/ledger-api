# Architecture

## System Overview

Ledger API is a **double-entry accounting engine** that manages digital wallet accounts, P2P transfers, and deposits with transactional integrity. Every money movement creates exactly two ledger entries (debit + credit) inside a single MongoDB ACID transaction, ensuring the books always balance.

An AI-powered fraud detection layer (Claude API) evaluates each transfer in real time and assigns a risk score before the transaction is committed.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│                  (Postman / Frontend)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                         │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐   │
│  │ Helmet  │ │ CORS     │ │ Rate   │ │ Request Logger   │   │
│  │         │ │ (strict) │ │ Limiter│ │                  │   │
│  └─────────┘ └──────────┘ └────────┘ └──────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     AUTH LAYER                                │
│  ┌──────────────────┐  ┌─────────────────────────────────┐   │
│  │ JWT Verification │  │ Zod Input Validation            │   │
│  │ (HS256)          │  │ (body, params, query)           │   │
│  └──────────────────┘  └─────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                           │
│                                                               │
│  ┌────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │ Routes     │  │ Controllers    │  │ Middleware         │   │
│  │ (routing   │→ │ (validate I/O, │→ │ (idempotency,     │   │
│  │  only)     │  │  HTTP response)│  │  error handler)    │   │
│  └────────────┘  └───────┬────────┘  └───────────────────┘   │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   SERVICES                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │    │
│  │  │ Auth         │ │ Account      │ │ Transfer     │  │    │
│  │  │ Service      │ │ Service      │ │ Service      │  │    │
│  │  └──────────────┘ └──────────────┘ └──────┬───────┘  │    │
│  │                                           │          │    │
│  │                    ┌──────────────────────┐│          │    │
│  │                    │ Risk Assessment      ││          │    │
│  │                    │ Service (Claude API) │◄┘          │    │
│  │                    └──────────────────────┘           │    │
│  │  ┌──────────────┐                                    │    │
│  │  │ Deposit      │                                    │    │
│  │  │ Service      │                                    │    │
│  │  └──────────────┘                                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               REPOSITORIES                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │    │
│  │  │ User         │ │ Account      │ │ LedgerEntry  │  │    │
│  │  │ Repository   │ │ Repository   │ │ Repository   │  │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │    │
│  │  ┌──────────────┐ ┌──────────────┐                   │    │
│  │  │ Transaction  │ │ Idempotency  │                   │    │
│  │  │ Repository   │ │ Repository   │                   │    │
│  │  └──────────────┘ └──────────────┘                   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                  │
│           MongoDB Atlas (Replica Set + Transactions)          │
│                                                               │
│  Collections:                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ users    │ │ accounts │ │ ledgerEntries│ │transactions│  │
│  └──────────┘ └──────────┘ └──────────────┘ └────────────┘  │
│  ┌────────────────┐ ┌──────────────┐                         │
│  │ idempotencyKeys│ │ auditLogs    │                         │
│  └────────────────┘ └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ledger-api/
├── .agents/
│   ├── rules/ledger-api/
│   │   ├── 01-naming-conventions.md
│   │   ├── 02-error-handling.md
│   │   ├── 03-security-rules.md
│   │   ├── 04-database-rules.md
│   │   └── 05-api-response-format.md
│   └── skills/backend-engineer/
│       ├── SKILL.md
│       ├── Architecture.md
│       ├── Domain.md
│       ├── FraudDetection.md
│       └── Workflows.md
├── docs/
│   ├── decisions/
│   │   ├── 001-double-entry-ledger.md
│   │   ├── 002-jwt-signing-strategy.md
│   │   ├── 003-fraud-detection-ai.md
│   │   ├── 004-deployment-railway.md
│   │   └── 005-native-driver-over-mongoose.md
│   ├── api-reference.md
│   ├── architecture.md          ← (this file)
│   ├── audit-report.md
│   ├── development.md
│   ├── roadmap.md
│   └── status.md
├── src/
│   ├── config/
│   │   ├── database.ts          — MongoDB connection + index creation
│   │   ├── environment.ts       — Typed env vars with Zod validation
│   │   └── swagger.ts           — Swagger/OpenAPI setup
│   ├── domain/
│   │   ├── constants.ts               — System constants (EXTERNAL_ACCOUNT_ID)
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── account.entity.ts
│   │   │   ├── ledger-entry.entity.ts
│   │   │   ├── transaction.entity.ts
│   │   │   ├── idempotency-key.entity.ts
│   │   │   └── audit-log.entity.ts
│   │   ├── enums/
│   │   │   ├── entry-type.enum.ts       — DEBIT | CREDIT
│   │   │   ├── transaction-type.enum.ts — P2P | DEPOSIT
│   │   │   ├── transaction-status.enum.ts — COMPLETED | BLOCKED
│   │   │   ├── risk-level.enum.ts       — LOW | MEDIUM | HIGH
│   │   │   ├── account-status.enum.ts   — ACTIVE | FROZEN | CLOSED
│   │   │   └── audit-action.enum.ts     — REGISTER | LOGIN | TRANSFER | DEPOSIT | BLOCKED
│   │   └── value-objects/
│   │       ├── money.vo.ts              — Amount + currency, no floating point
│   │       └── idempotency-key.vo.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── account.repository.ts
│   │   ├── ledger-entry.repository.ts
│   │   ├── transaction.repository.ts
│   │   ├── idempotency.repository.ts
│   │   └── audit-log.repository.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── account.service.ts
│   │   ├── transfer.service.ts
│   │   ├── deposit.service.ts
│   │   └── risk-assessment.service.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── account.controller.ts
│   │   ├── transfer.controller.ts
│   │   └── deposit.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── idempotency.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── request-id.middleware.ts
│   │   └── response-headers.middleware.ts
│   ├── schemas/                         — Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── account.schema.ts
│   │   ├── transfer.schema.ts
│   │   └── deposit.schema.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── account.routes.ts
│   │   ├── transfer.routes.ts
│   │   ├── deposit.routes.ts
│   │   └── index.ts                    — Route aggregator
│   ├── types/
│   │   └── express.d.ts               — Request augmentation (user, requestId)
│   ├── utils/
│   │   ├── result.ts                   — Result<T, E> pattern
│   │   ├── response.ts                — HTTP response helpers (sendSuccess, sendError, sendPaginated)
│   │   ├── logger.ts                   — Structured logging (pino)
│   │   ├── hash.ts                     — Password hashing (bcrypt)
│   │   └── token.ts                    — JWT sign/verify helpers
│   ├── app.ts                          — Express app factory
│   └── server.ts                       — Entry point
├── tests/
│   ├── unit/
│   │   ├── deposit.service.test.ts
│   │   ├── transfer.service.test.ts
│   │   └── risk-assessment.service.test.ts
│   └── helpers/
│       ├── test-db.ts                  — In-memory MongoDB for tests
│       └── setup-env.ts               — Test environment variables
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.test.json
├── jest.config.js
├── postman_collection.json
├── AGENTS.md
└── README.md
```

## Layer Responsibilities

### Routes (`src/routes/`)
- HTTP method + path declaration only.
- Attach middleware chain (auth, validation, idempotency).
- Delegate to controller. **No business logic.**

### Controllers (`src/controllers/`)
- Extract validated data from `req`.
- Call the appropriate service method.
- Map the `Result<T, E>` to an HTTP response (status code + body).
- **No direct database access. No business logic.**

### Services (`src/services/`)
- All business logic lives here.
- Return `Result<T, E>` — never throw exceptions.
- Receive repository instances via constructor injection.
- The `TransferService` orchestrates: idempotency check → risk assessment → ledger write (within a MongoDB session/transaction).

### Repositories (`src/repositories/`)
- Direct MongoDB driver interaction (`mongodb` native driver, no Mongoose).
- Each repository maps to one collection.
- Accept a `ClientSession` parameter for transactional operations.
- Return typed domain entities.

### Domain (`src/domain/`)
- Pure TypeScript types, interfaces, enums, and value objects.
- No framework imports. No database imports.
- The `Money` value object uses integer cents (never floating point) to avoid precision issues.

## Double-Entry Ledger Data Flow

```
Transfer $100 from Account A → Account B

1. Client sends POST /api/v1/transfers
   {
     "fromAccountId": "...",
     "toAccountId": "...",
     "amount": 10000,        ← cents (integer)
     "currency": "MXN",
     "description": "P2P transfer",
     "idempotencyKey": "uuid-v4"
   }

2. Idempotency middleware checks if key exists → if yes, return cached response.

3. TransferService receives the request:
   a. Validate both accounts exist and are ACTIVE
   b. Validate sender has sufficient balance
   c. Call RiskAssessmentService → get risk score from Claude API
   d. If risk is HIGH → block transaction, return 403
   e. If risk is LOW/MEDIUM → proceed

4. Inside a MongoDB transaction (session):
   a. Create Transaction document (status: COMPLETED, riskScore, riskLevel)
   b. Create LedgerEntry: { accountId: A, type: DEBIT,  amount: 10000, transactionId }
   c. Create LedgerEntry: { accountId: B, type: CREDIT, amount: 10000, transactionId }
   d. Update Account A: decrement balance by 10000
   e. Update Account B: increment balance by 10000
   f. Store idempotency key + response
   g. Create AuditLog entry
   h. Commit transaction

5. Return 201 with transaction details.
```

## MongoDB Collections Schema

### `users`
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "passwordHash": "string",
  "fullName": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `accounts`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "accountNumber": "string (unique, generated)",
  "balance": "number (integer, cents)",
  "currency": "string (ISO 4217, e.g. MXN)",
  "status": "string (ACTIVE | FROZEN | CLOSED)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `transactions`
```json
{
  "_id": "ObjectId",
  "type": "string (P2P | DEPOSIT)",
  "fromAccountId": "ObjectId | null",
  "toAccountId": "ObjectId",
  "amount": "number (integer, cents)",
  "currency": "string",
  "description": "string",
  "riskScore": "number (0-100)",
  "riskLevel": "string (LOW | MEDIUM | HIGH)",
  "status": "string (COMPLETED | BLOCKED)",
  "idempotencyKey": "string (unique)",
  "createdAt": "Date"
}
```

### `ledgerEntries`
```json
{
  "_id": "ObjectId",
  "transactionId": "ObjectId (ref: transactions)",
  "accountId": "ObjectId (ref: accounts)",
  "entryType": "string (DEBIT | CREDIT)",
  "amount": "number (integer, cents)",
  "balanceAfter": "number (integer, cents)",
  "createdAt": "Date"
}
```
> **Append-only**: Ledger entries are never updated or deleted. Corrections are made by creating a new reversing transaction.

### `idempotencyKeys`
```json
{
  "_id": "ObjectId",
  "key": "string (unique)",
  "method": "string",
  "path": "string",
  "statusCode": "number",
  "responseBody": "string (JSON)",
  "createdAt": "Date",
  "expiresAt": "Date (TTL index, 24h)"
}
```

### `auditLogs`
```json
{
  "_id": "ObjectId",
  "action": "string (REGISTER | LOGIN | TRANSFER | DEPOSIT | BLOCKED)",
  "userId": "ObjectId",
  "metadata": "object",
  "ip": "string",
  "userAgent": "string",
  "createdAt": "Date"
}
```

## Indexes

| Collection        | Index                                      | Type     | Purpose                            |
| ----------------- | ------------------------------------------ | -------- | ---------------------------------- |
| `users`           | `{ email: 1 }`                             | Unique   | Fast lookup + uniqueness           |
| `accounts`        | `{ userId: 1 }`                            | Standard | Find accounts by user              |
| `accounts`        | `{ accountNumber: 1 }`                     | Unique   | Fast lookup by account number      |
| `ledgerEntries`   | `{ accountId: 1, createdAt: -1 }`          | Compound | Account history (paginated)        |
| `ledgerEntries`   | `{ transactionId: 1 }`                     | Standard | Find entries by transaction        |
| `transactions`    | `{ idempotencyKey: 1 }`                    | Unique   | Idempotency check                  |
| `transactions`    | `{ fromAccountId: 1, createdAt: -1 }`      | Compound | Sender history                     |
| `idempotencyKeys` | `{ key: 1 }`                               | Unique   | Fast idempotency lookup            |
| `idempotencyKeys` | `{ expiresAt: 1 }`                         | TTL      | Auto-cleanup after 24h             |
| `auditLogs`       | `{ userId: 1, createdAt: -1 }`             | Compound | Audit trail per user               |
