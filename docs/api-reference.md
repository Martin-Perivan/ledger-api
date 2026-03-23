# API Reference

**Base URL**: `https://<railway-domain>/api/v1`

All endpoints return JSON. All request bodies are validated with Zod. Amounts are always in **integer cents** (e.g., `10000` = $100.00 MXN). Deposit amounts must be a positive integer (min 1 cent, max 999,999,999 cents). Transfer amounts have a minimum of 100 cents ($1.00) and a maximum of 999,999,999 cents.

## Authentication

### POST `/auth/register`

Create a new user account.

**Body**:
```json
{
  "email": "user@example.com",
  "password": "MinLength8!",
  "fullName": "José Martín"
}
```

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "userId": "6615f...",
    "email": "user@example.com",
    "fullName": "José Martín"
  }
}
```

**Errors**: `400` validation, `409` email already exists.

---

### POST `/auth/login`

Authenticate and receive a JWT.

**Body**:
```json
{
  "email": "user@example.com",
  "password": "MinLength8!"
}
```

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 3600
  }
}
```

**Errors**: `401` invalid credentials.

---

## Accounts

> All endpoints below require `Authorization: Bearer <token>`.

### POST `/accounts`

Create a new digital wallet account for the authenticated user.

**Body**:
```json
{
  "currency": "MXN"
}
```

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "accountId": "6615f...",
    "accountNumber": "4580-1234-5678",
    "balance": 0,
    "currency": "MXN",
    "status": "ACTIVE"
  }
}
```

---

### GET `/accounts`

List all accounts for the authenticated user.

**Response `200`**:
```json
{
  "success": true,
  "data": [
    {
      "accountId": "6615f...",
      "accountNumber": "4580-1234-5678",
      "balance": 50000,
      "currency": "MXN",
      "status": "ACTIVE"
    }
  ]
}
```

---

### GET `/accounts/:accountId`

Get account details including balance.

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "accountId": "6615f...",
    "accountNumber": "4580-1234-5678",
    "balance": 50000,
    "currency": "MXN",
    "status": "ACTIVE",
    "createdAt": "2026-03-22T06:00:00.000Z"
  }
}
```

**Errors**: `404` account not found, `403` not your account.

---

### GET `/accounts/:accountId/history`

Get paginated ledger entries for an account.

**Query params**: `page` (default 1), `limit` (default 20, max 100).

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "entryId": "6615f...",
        "transactionId": "6615f...",
        "entryType": "CREDIT",
        "amount": 10000,
        "balanceAfter": 50000,
        "createdAt": "2026-03-22T06:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalEntries": 42,
      "totalPages": 3
    }
  }
}
```

---

## Deposits

### POST `/deposits`

Deposit funds into an account (simulated external funding).

**Headers**: `Idempotency-Key: <uuid-v4>` (required).

**Body**:
```json
{
  "accountId": "6615f...",
  "amount": 50000,
  "currency": "MXN",
  "description": "Initial funding"
}
```

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "transactionId": "6615f...",
    "type": "DEPOSIT",
    "accountId": "6615f...",
    "amount": 50000,
    "currency": "MXN",
    "status": "COMPLETED",
    "createdAt": "2026-03-22T06:00:00.000Z"
  }
}
```

**Errors**: `400` validation, `404` account not found, `409` duplicate idempotency key.

---

## Transfers

### POST `/transfers`

Execute a P2P transfer between two accounts. Triggers AI fraud detection.

**Headers**: `Idempotency-Key: <uuid-v4>` (required).

**Body**:
```json
{
  "fromAccountId": "6615f...",
  "toAccountId": "6616a...",
  "amount": 10000,
  "currency": "MXN",
  "description": "Payment for dinner"
}
```

**Response `201`** (approved):
```json
{
  "success": true,
  "data": {
    "transactionId": "6615f...",
    "type": "P2P",
    "fromAccountId": "6615f...",
    "toAccountId": "6616a...",
    "amount": 10000,
    "currency": "MXN",
    "status": "COMPLETED",
    "riskAssessment": {
      "riskScore": 12,
      "riskLevel": "LOW",
      "flags": []
    },
    "createdAt": "2026-03-22T06:00:00.000Z"
  }
}
```

**Response `403`** (blocked by fraud detection):
```json
{
  "success": false,
  "error": {
    "code": "TRANSFER_BLOCKED",
    "message": "Transaction blocked by fraud detection. Risk score: 85 (HIGH)."
  }
}
```

**Errors**: `400` validation, `404` account not found, `403` not your account / blocked, `409` duplicate idempotency key, `422` insufficient funds.

---

## Common Error Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

## Common HTTP Status Codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 200  | OK — successful read                  |
| 201  | Created — resource created             |
| 400  | Bad Request — validation failed        |
| 401  | Unauthorized — missing/invalid token   |
| 403  | Forbidden — access denied or blocked   |
| 404  | Not Found                              |
| 409  | Conflict — duplicate resource          |
| 422  | Unprocessable — business rule violated |
| 429  | Too Many Requests — rate limited       |
| 500  | Internal Server Error                  |

## Rate Limits

| Scope         | Limit                   |
| ------------- | ----------------------- |
| Global        | 100 requests/minute/IP  |
| Auth routes   | 10 requests/minute/IP   |
| Transfers     | 30 requests/minute/user |

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_access_token>
```

JWT payload contains: `{ userId, email, iat, exp }`. Token expires in 1 hour.
