# Audit Report — Security Measures

## Threat Model

As a fintech ledger handling account balances and transfers, the primary threats are:

1. **Unauthorized access** — Stolen tokens, brute-force login attempts.
2. **Data tampering** — Modifying balances or ledger entries directly.
3. **Injection attacks** — NoSQL injection via unvalidated input.
4. **Replay attacks** — Submitting the same transfer request multiple times.
5. **Fraud** — Unusual transaction patterns (money laundering, stolen accounts).
6. **Data exposure** — Leaking sensitive fields in API responses.

## Security Measures Implemented

### 1. Authentication

| Measure                  | Implementation                                |
| ------------------------ | --------------------------------------------- |
| Password hashing         | bcrypt with salt rounds = 12                  |
| JWT signing              | HS256 with 64-char random secret              |
| Token expiry             | 1 hour (`exp` claim)                          |
| No token in URL          | Bearer token in `Authorization` header only   |
| Password policy          | Min 8 chars, validated by Zod schema          |

> **Roadmap**: Migrate to RS256 (asymmetric keys) for zero-trust environments. See `docs/decisions/002-jwt-signing-strategy.md`.

### 2. Input Validation

| Measure                     | Implementation                                |
| --------------------------- | --------------------------------------------- |
| Schema validation           | Zod on every endpoint (body, params, query)   |
| Type coercion prevention    | Strict mode — no implicit type casting        |
| ObjectId validation         | Custom Zod refine for MongoDB ObjectId format |
| Amount validation           | Positive integer only (cents), max 999999999  |
| String sanitization         | Max length on all string fields               |

### 3. API Gateway Security

| Measure                  | Implementation                                |
| ------------------------ | --------------------------------------------- |
| HTTP headers             | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS                     | Strict origin whitelist, no wildcards         |
| Rate limiting            | express-rate-limit (see API Reference)        |
| Request size limit       | 10KB JSON body max (`express.json` limit)     |
| Request logging          | pino structured logs (no sensitive data)      |

### 4. Idempotency

| Measure                     | Implementation                                |
| --------------------------- | --------------------------------------------- |
| Idempotency key             | UUID v4 in `Idempotency-Key` header           |
| Scope                       | Required on POST `/transfers` and `/deposits` |
| Storage                     | `idempotencyKeys` collection with TTL (24h)   |
| Behavior on duplicate       | Return cached response, no re-execution       |

### 5. Transactional Integrity

| Measure                     | Implementation                                |
| --------------------------- | --------------------------------------------- |
| ACID transactions           | MongoDB multi-document transactions (session) |
| Atomic balance updates      | Debit + credit inside same transaction        |
| Append-only ledger          | `ledgerEntries` never updated or deleted      |
| Balance as derived value    | Balance stored on account but validated against ledger sum |
| Integer arithmetic          | All amounts in cents — no floating point ever |
| Write durability            | writeConcern: majority + journal, readConcern: local |

### 6. Fraud Detection (AI Layer)

| Measure                     | Implementation                                   |
| --------------------------- | ------------------------------------------------ |
| Real-time scoring           | Claude API evaluates each transfer pre-commit    |
| Risk levels                 | LOW (0-40), MEDIUM (41-70), HIGH (71-100)        |
| HIGH risk action            | Transaction blocked, 403 returned                |
| MEDIUM risk action          | Transaction completed, flagged in audit log      |
| Timeout handling            | 3-second timeout, fallback to basic rules        |
| Basic fallback rules        | Block if amount > 500,000 cents OR > 5 transfers/min |

### 7. Data Protection

| Measure                     | Implementation                                |
| --------------------------- | --------------------------------------------- |
| No sensitive data in logs   | Passwords, tokens, full account numbers masked|
| Response filtering          | Only return fields the client needs           |
| No stack traces in prod     | Error handler strips internal details         |
| Environment variables       | All secrets via `.env`, never committed        |
| `.gitignore`                | Covers `.env`, `node_modules`, `dist/`         |

### 8. Audit Trail

| Measure                     | Implementation                                |
| --------------------------- | --------------------------------------------- |
| Immutable audit log         | Every action writes to `auditLogs` collection |
| Logged events               | REGISTER, LOGIN, TRANSFER, DEPOSIT, BLOCKED   |
| Metadata captured           | userId, IP, userAgent, timestamp, risk score  |
| No deletion                 | Audit logs are append-only                    |

## OWASP API Security Top 10 Coverage

| OWASP Risk                          | Mitigation                                    |
| ----------------------------------- | --------------------------------------------- |
| API1 — Broken Object Level Auth     | Account ownership validated on every request  |
| API2 — Broken Authentication        | bcrypt + JWT + rate limiting on auth routes   |
| API3 — Broken Object Property Auth  | Zod strips unknown fields, response filtering |
| API4 — Unrestricted Resource Consumption | Rate limiting per IP and per user         |
| API5 — Broken Function Level Auth   | Middleware chain: auth → ownership → action   |
| API6 — Unrestricted Access to Sensitive Flows | Idempotency + fraud detection      |
| API7 — Server-Side Request Forgery  | No user-supplied URLs processed               |
| API8 — Security Misconfiguration    | Helmet, strict CORS, no debug in production   |
| API9 — Improper Inventory Mgmt      | All endpoints documented in Swagger + Postman |
| API10 — Unsafe API Consumption      | Claude API call has timeout + error handling  |

## Known Limitations (Documented for Transparency)

- HS256 JWT (symmetric) — suitable for single-service architectures; RS256 recommended for microservices (see roadmap).
- No refresh token rotation — access token only for MVP scope.
- No mTLS between services — single-service deployment, not needed yet.
- Fraud detection depends on external API — fallback rules mitigate outage risk.
- No PCI DSS compliance — this is a demo/portfolio project, not processing real payment card data.
