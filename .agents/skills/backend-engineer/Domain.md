# Domain Knowledge

## Double-Entry Bookkeeping

Every financial transaction creates exactly **two** ledger entries that sum to zero:

- **DEBIT**: Money leaves an account (reduces balance).
- **CREDIT**: Money enters an account (increases balance).

### Transfer Example ($100 from A to B)

| Entry | Account | Type   | Amount (cents) |
| ----- | ------- | ------ | -------------- |
| 1     | A       | DEBIT  | 10000          |
| 2     | B       | CREDIT | 10000          |

**Invariant**: `SUM(all CREDIT amounts) - SUM(all DEBIT amounts) = 0` across the entire system at all times.

### Deposit Example ($500 into account A)

For deposits, the system uses a virtual **"external"** account that represents money entering the platform:

| Entry | Account  | Type   | Amount (cents) |
| ----- | -------- | ------ | -------------- |
| 1     | EXTERNAL | DEBIT  | 50000          |
| 2     | A        | CREDIT | 50000          |

The EXTERNAL account is a system-level entity — it has no real balance but keeps the double-entry invariant intact.

## Core Entities

### User
- Represents a registered person.
- Has email + password credentials.
- Can own multiple accounts.

### Account
- A digital wallet owned by a user.
- Has a `balance` (integer cents), `currency`, and `status`.
- Balance is updated atomically inside MongoDB transactions.
- Balance is a cached value — the true balance can be reconstructed from ledger entries.

### Transaction
- Represents a financial operation (P2P transfer or deposit).
- Links to the ledger entries it created.
- Stores risk assessment results (score, level, flags).
- Stores the idempotency key for deduplication.
- Immutable once created — status is set at creation time.

### LedgerEntry
- A single debit or credit against an account.
- Always created in pairs (or more, for complex transactions).
- **Append-only**: Never updated or deleted.
- Stores `balanceAfter` for instant point-in-time balance lookups.

### IdempotencyKey
- Prevents duplicate execution of the same operation.
- Stores the full response so duplicates return the exact same result.
- Has a TTL index (24 hours) for automatic cleanup.

### AuditLog
- Records every significant action in the system.
- **Append-only**: Never updated or deleted.
- Captures userId, action, IP, userAgent, timestamp, and metadata.

## Business Rules

1. **A user can have multiple accounts** — e.g., one in MXN, one in USD. There is no limit on the number of accounts per user in MVP (would be configurable per KYC tier in production).
2. **Accounts must be ACTIVE** to send or receive transfers.
3. **Sender must have sufficient balance** — no negative balances allowed.
4. **Self-transfers are forbidden** — `fromAccountId` must differ from `toAccountId`.
5. **Same currency only** — both accounts must share the same currency (multi-currency in roadmap).
6. **Minimum transfer**: 100 cents ($1.00). **Maximum transfer**: 999,999,999 cents ($9,999,999.99).
7. **Deposits have no maximum** in MVP (would be configurable per KYC tier in production).
8. **HIGH risk transactions are blocked** — the transfer is not executed, and a BLOCKED transaction record is created for audit purposes.
9. **MEDIUM risk transactions proceed** but are flagged in the audit log for manual review.
10. **A user can only operate their own accounts** — ownership is verified by matching `req.user.userId` against `account.userId` on every request.

## Value Objects

### Money
```typescript
interface Money {
  amount: number;   // Integer cents, always positive
  currency: string; // ISO 4217 (e.g., "MXN")
}
```
- Never constructed from floating point. Always integer input.
- Arithmetic is integer arithmetic: `balance - transferAmount` — no rounding needed.

### IdempotencyKey
```typescript
interface IdempotencyKeyValue {
  key: string;       // UUID v4
  method: string;    // HTTP method
  path: string;      // Request path
}
```
- Uniqueness is per key + method + path combination.
