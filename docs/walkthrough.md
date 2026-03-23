# Ledger API — Walkthrough Guide

A hands-on guide to test every endpoint and understand how the entire system works. Run each step in order using `curl` from your terminal.

**Prerequisites:**
- Server running Railway: `https://ledger-api-production-0e70.up.railway.app/api/v1`

**Convention:** All amounts are in **integer cents** (e.g., `50000` = $500.00 MXN).

---

## Step 1: Register a User

**What happens internally:**
- Zod validates the body (email format, password min 8 chars, fullName max length)
- `AuthService.register()` checks if email already exists (query with `$eq` to prevent NoSQL injection)
- Password is hashed with `bcrypt` (12 salt rounds) — the plain text password is never stored
- A new document is inserted into the `users` collection
- An audit log entry is created with action `REGISTER`

```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin@certero.com",
    "password": "Certero2026!",
    "fullName": "José Martín Perivan"
  }' | jq
```

**Expected response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "martin@certero.com",
    "fullName": "José Martín Perivan"
  }
}
```

**Try it wrong — duplicate email (409):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin@certero.com",
    "password": "Another123!",
    "fullName": "Duplicate User"
  }' | jq
```

**Try it wrong — weak password (400):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@certero.com",
    "password": "123",
    "fullName": "Weak Password"
  }' | jq
```

> **Takeaway:** The system rejects duplicates (unique index on `email`) and weak passwords (Zod validation). Passwords are never stored in plain text.

---

## Step 2: Login and Get JWT

**What happens internally:**
- Zod validates the body
- `AuthService.login()` finds user by email, compares password with `bcrypt.compare()`
- If valid, generates a JWT token (HS256) with payload `{ userId, email }` and 1-hour expiry
- An audit log entry is created with action `LOGIN`

```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin@certero.com",
    "password": "Certero2026!"
  }' | jq
```

**Expected response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

**Save the token for all subsequent requests:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

> **Tip:** Copy the full `accessToken` value and paste it in the `TOKEN` variable. Every request below uses it.

**Try it wrong — bad password (401):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin@certero.com",
    "password": "WrongPassword"
  }' | jq
```

> **Takeaway:** The JWT contains `userId` and `email` — no sensitive data. It expires in 1 hour. The server never stores tokens; it just verifies the signature.

---

## Step 3: Create Two Accounts

**What happens internally:**
- `auth.middleware` extracts and verifies the JWT from the `Authorization` header
- `AccountService.create()` generates a unique account number
- A new document is inserted into the `accounts` collection with `balance: 0`, `status: ACTIVE`
- A user can have multiple accounts (Business Rule #1)

**Account A (your main wallet):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "MXN"
  }' | jq
```

**Save the account ID:**
```bash
ACCOUNT_A="<paste accountId from response>"
```

**Account B (secondary wallet):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "MXN"
  }' | jq
```

**Save the account ID:**
```bash
ACCOUNT_B="<paste accountId from response>"
```

**Try it without token (401):**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"currency": "MXN"}' | jq
```

> **Takeaway:** Both accounts start with balance 0. The `auth.middleware` protects every endpoint — no token, no access.

---

## Step 4: List Your Accounts

**What happens internally:**
- `AccountService.listByUser()` queries `accounts` where `userId` matches the JWT's `userId`
- Only YOUR accounts are returned (Business Rule #10 — ownership check)

```bash
curl -s -X GET https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Two accounts, both with `balance: 0`.

---

## Step 5: Deposit Funds

**What happens internally — this is where double-entry starts:**
1. `idempotency.middleware` checks the `Idempotency-Key` header — if this key was already used, it returns the cached response immediately (no re-execution)
2. `DepositService.execute()` validates: account exists, is ACTIVE, belongs to you, currency matches
3. Inside a **MongoDB ACID transaction** (`session.withTransaction()`):
   - Creates a `Transaction` document (type: DEPOSIT, status: COMPLETED)
   - Creates **2 ledger entries**:
     - DEBIT on EXTERNAL account (money enters the platform)
     - CREDIT on your account (money arrives in your wallet)
   - Updates your account balance with `$inc` (atomic increment)
   - Stores the idempotency key + cached response
   - Creates an audit log entry
4. If ANY step fails, the entire transaction rolls back — your balance is never partially updated

**Deposit $500.00 MXN into Account A:**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/deposits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "accountId": "'$ACCOUNT_A'",
    "amount": 50000,
    "currency": "MXN",
    "description": "Initial funding"
  }' | jq
```

**Expected response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "...",
    "type": "DEPOSIT",
    "amount": 50000,
    "currency": "MXN",
    "status": "COMPLETED"
  }
}
```

**Deposit $200.00 MXN into Account B:**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/deposits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "accountId": "'$ACCOUNT_B'",
    "amount": 20000,
    "currency": "MXN",
    "description": "Secondary funding"
  }' | jq
```

**Verify balances:**
```bash
curl -s -X GET https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Account A = 50000, Account B = 20000.

> **Takeaway:** The double-entry pattern means every deposit creates TWO entries (EXTERNAL DEBIT + your CREDIT). The sum across the entire system is always zero. The `Idempotency-Key` prevents you from accidentally depositing twice.

---

## Step 6: Test Idempotency

**What happens internally:**
- The idempotency middleware finds the key in `idempotencyKeys` collection
- It returns the **exact same cached response** from the first execution
- The deposit is NOT executed again — your balance stays the same

**Use a FIXED key and run it twice:**
```bash
FIXED_KEY="11111111-1111-1111-1111-111111111111"

# First time — deposits $100.00
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/deposits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $FIXED_KEY" \
  -d '{
    "accountId": "'$ACCOUNT_A'",
    "amount": 10000,
    "currency": "MXN",
    "description": "Idempotency test"
  }' | jq

# Second time — SAME key, returns cached response
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/deposits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $FIXED_KEY" \
  -d '{
    "accountId": "'$ACCOUNT_A'",
    "amount": 10000,
    "currency": "MXN",
    "description": "Idempotency test"
  }' | jq
```

**Verify balance — should be 60000 (not 70000):**
```bash
curl -s -X GET https://ledger-api-production-0e70.up.railway.app/api/v1/accounts/$ACCOUNT_A \
  -H "Authorization: Bearer $TOKEN" | jq '.data.balance'
```

> **Takeaway:** This is critical in fintech. Network retries, client bugs, or user double-clicks must never cause duplicate transactions. The idempotency key (TTL 24h) guarantees exactly-once execution.

---

## Step 7: P2P Transfer (with Fraud Detection)

**What happens internally — the most complex flow:**
1. `idempotency.middleware` checks the key
2. `TransferService.execute()` validates:
   - Not a self-transfer (Business Rule #4)
   - Both accounts exist and are ACTIVE (Rule #2)
   - You own the sender account (Rule #10)
   - Same currency (Rule #5)
   - Sufficient balance (Rule #3)
   - Amount between 100-999999999 cents (Rule #6)
3. **Risk Assessment** (before any money moves):
   - `RiskAssessmentService` gathers context: sender history, average amount, velocity, recipient novelty
   - Calls Claude API (or falls back to deterministic rules if no API key)
   - Returns `{ riskScore, riskLevel, flags }`
   - **HIGH (71-100):** transaction BLOCKED, 403 returned, no money moves
   - **MEDIUM (41-70):** proceeds but flagged in audit log
   - **LOW (0-40):** proceeds normally
4. Inside a **MongoDB ACID transaction**:
   - Creates `Transaction` document with risk assessment data
   - Creates **2 ledger entries**:
     - DEBIT on Account A (money leaves)
     - CREDIT on Account B (money arrives)
   - Updates both balances atomically with `$inc`
   - Stores idempotency key
   - Creates audit log entry
5. If ANY step fails, the entire transaction rolls back

**Transfer $100.00 from Account A to Account B:**
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "fromAccountId": "'$ACCOUNT_A'",
    "toAccountId": "'$ACCOUNT_B'",
    "amount": 10000,
    "currency": "MXN",
    "description": "Payment for dinner"
  }' | jq
```

**Expected response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "...",
    "type": "P2P",
    "amount": 10000,
    "status": "COMPLETED",
    "riskAssessment": {
      "riskScore": 25,
      "riskLevel": "LOW",
      "flags": ["new_account"]
    }
  }
}
```

**Verify balances:**
```bash
curl -s -X GET https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {accountId: .accountId, balance: .balance}'
```

**Expected:** Account A = 50000 (60000 - 10000), Account B = 30000 (20000 + 10000).

> **Takeaway:** The transfer atomically debits one account and credits another. If the risk score is HIGH, no money moves at all. The `new_account` flag appeared because the account was just created.

---

## Step 8: Test Business Rule Violations

### Self-transfer (Rule #4):
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "fromAccountId": "'$ACCOUNT_A'",
    "toAccountId": "'$ACCOUNT_A'",
    "amount": 1000,
    "currency": "MXN",
    "description": "Self transfer"
  }' | jq
```
**Expected:** Error with code `SELF_TRANSFER` or similar.

### Insufficient funds (Rule #3):
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "fromAccountId": "'$ACCOUNT_A'",
    "toAccountId": "'$ACCOUNT_B'",
    "amount": 99999999,
    "currency": "MXN",
    "description": "Too much"
  }' | jq
```
**Expected:** Error with code `INSUFFICIENT_FUNDS` (422).

### Below minimum amount (Rule #6):
```bash
curl -s -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen | tr '[:upper:]' '[:lower:]')" \
  -d '{
    "fromAccountId": "'$ACCOUNT_A'",
    "toAccountId": "'$ACCOUNT_B'",
    "amount": 50,
    "currency": "MXN",
    "description": "Below minimum"
  }' | jq
```
**Expected:** Validation error (400) — minimum is 100 cents ($1.00).

> **Takeaway:** Every business rule is enforced BEFORE any money moves. The service validates everything upfront and returns a descriptive error code.

---

## Step 9: View Ledger History

**What happens internally:**
- `AccountService.getHistory()` queries `ledgerEntries` filtered by `accountId`, sorted by `createdAt DESC`
- Returns paginated results with `balanceAfter` for each entry — you can trace the balance at any point in time
- This is the **audit trail** — these entries are NEVER modified or deleted

**Account A history (all movements):**
```bash
curl -s -X GET "https://ledger-api-production-0e70.up.railway.app/api/v1/accounts/$ACCOUNT_A/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected entries (newest first):**
1. DEBIT -10000 (transfer to Account B)
2. CREDIT +10000 (idempotency test deposit)
3. CREDIT +50000 (initial funding)

**Account B history:**
```bash
curl -s -X GET "https://ledger-api-production-0e70.up.railway.app/api/v1/accounts/$ACCOUNT_B/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected entries:**
1. CREDIT +10000 (transfer from Account A)
2. CREDIT +20000 (secondary funding)

> **Takeaway:** The ledger is the source of truth. Every cent is traceable. `balanceAfter` lets you reconstruct the account state at any moment. This is exactly how banks work.

---

## Step 10: Security Headers Check

**Verify the API gateway is doing its job:**
```bash
curl -s -D - -o /dev/null https://ledger-api-production-0e70.up.railway.app/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN"
```

**Look for these headers:**
- `X-Request-Id: <uuid>` — unique per request, for log correlation
- `X-Response-Time: <ms>` — response duration
- `Cache-Control: no-store` — financial data is never cached
- `X-Content-Type-Options: nosniff` — Helmet security header
- `Strict-Transport-Security: ...` — HSTS (Helmet)
- `X-Frame-Options: SAMEORIGIN` — clickjacking protection (Helmet)

> **Takeaway:** Helmet adds ~10 security headers automatically. `Cache-Control: no-store` ensures financial data is never cached by browsers or proxies.

---

## Step 11: Rate Limiting Test

**Hit the auth endpoint rapidly to trigger rate limiting:**
```bash
for i in {1..15}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST https://ledger-api-production-0e70.up.railway.app/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

**Expected:** First 10 return `401` (invalid credentials). Requests 11+ return `429` (Too Many Requests) because auth routes allow max 10 requests/minute/IP.

> **Takeaway:** Rate limiting protects against brute-force attacks. Auth routes are stricter (10/min) than general routes (100/min).

---

## Step 12: Swagger Documentation

Open in your browser:

```
https://ledger-api-production-0e70.up.railway.app/api-docs
```

You will see the full OpenAPI 3.0 documentation with:
- All 8 endpoints
- Request/response schemas
- The ability to "Try it out" directly from the browser
- Security scheme (Bearer JWT) configuration

> **Takeaway:** Swagger lets the Certero partners explore and test the API without reading code or using Postman.

---

## Summary: What You Built

```
REGISTER → creates user (bcrypt hash)
LOGIN → returns JWT (HS256, 1hr expiry)
CREATE ACCOUNT → digital wallet (balance: 0, status: ACTIVE)
DEPOSIT → double-entry (EXTERNAL DEBIT + account CREDIT) inside ACID transaction
TRANSFER → risk assessment (AI) → double-entry (sender DEBIT + recipient CREDIT) inside ACID transaction
HISTORY → append-only ledger entries with balanceAfter

Security: Zod validation → JWT auth → ownership check → idempotency → rate limiting → Helmet → audit log
```

Every operation that moves money uses:
1. **Double-entry bookkeeping** (two entries that sum to zero)
2. **MongoDB ACID transactions** (all-or-nothing)
3. **Idempotency** (exactly-once execution)
4. **Audit trail** (immutable, append-only)

This is how real fintechs work internally.
