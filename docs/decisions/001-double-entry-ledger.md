# ADR-001: Double-Entry Ledger for Transaction Integrity

## Status
Accepted

## Context
We need a system to track money movements between digital wallet accounts. Two common approaches exist:

1. **Balance-only**: Store a `balance` field on each account and increment/decrement it on each transaction.
2. **Double-entry ledger**: Every transaction creates two entries (debit + credit) in an append-only ledger. Balances can be derived from the ledger at any time.

## Decision
We adopt the **double-entry ledger** pattern with a cached balance on the account document.

## Rationale

- **Auditability**: Every cent is traceable. You can reconstruct any account's balance at any point in time by summing its ledger entries.
- **Immutability**: Ledger entries are never modified or deleted. Corrections are made via reversing entries. This matches how real financial institutions operate.
- **Integrity verification**: At any point, `SUM(credits) - SUM(debits)` across the entire system must equal zero. This invariant is a powerful self-check.
- **Regulatory alignment**: Double-entry bookkeeping is the standard in financial services worldwide. Using it demonstrates understanding of the domain.
- **Cached balance**: We store the current balance on the `accounts` document for fast reads, but this is always updated atomically inside the same MongoDB transaction that creates the ledger entries.

## Consequences

- Slightly more complex writes (two inserts + one update per transaction instead of one update).
- Storage grows linearly with transactions (append-only), but this is expected and desirable for a financial system.
- Balance queries are O(1) thanks to the cached field, not O(n) against the ledger.
