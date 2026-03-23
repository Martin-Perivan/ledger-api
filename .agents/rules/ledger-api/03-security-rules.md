# Rule: Security Rules

## Mandatory Security Practices

These rules are non-negotiable. Every generated code must comply.

### 1. Input Validation

- **Every** endpoint body, query, and param MUST be validated with a Zod schema.
- Zod schemas MUST use `.strict()` to reject unknown fields.
- MongoDB ObjectId strings MUST be validated with a custom Zod refine:
  ```typescript
  const objectIdSchema = z.string().refine((val) => /^[a-f\d]{24}$/i.test(val), {
    message: "Invalid ObjectId format",
  });
  ```
- Amount fields MUST be `z.number().int().positive().max(999_999_999)`.
- String fields MUST have `.max()` length limits.
- Email fields MUST use `z.string().email().max(254)`.

### 2. Authentication

- Passwords MUST be hashed with `bcrypt` (salt rounds = 12). Never store plain text.
- JWT tokens MUST include `userId`, `email`, `iat`, `exp` claims.
- JWT secret MUST be at least 64 characters of cryptographic randomness.
- Token expiry MUST be set (1 hour for access token).
- The `Authorization` header format is `Bearer <token>` — reject anything else.

### 3. Authorization

- Every protected endpoint MUST verify the JWT in `auth.middleware.ts`.
- Account operations MUST verify that `req.user.userId` matches `account.userId`. Never assume ownership from the token alone without a database check.
- A user MUST NOT be able to access another user's accounts or transactions.

### 4. Data Protection

- **Never log**: passwords, tokens, full account numbers, API keys.
- **Never return**: `passwordHash`, internal `_id` without mapping, MongoDB error details.
- Mask account numbers in logs: show only last 4 digits.
- All secrets MUST come from environment variables. Never hardcode.

### 5. HTTP Security

- Helmet.js MUST be enabled with default settings (CSP, HSTS, X-Frame-Options, etc.).
- CORS MUST use an explicit origin whitelist. Never use `*` in production.
- Request body size MUST be limited to 10KB (`express.json({ limit: '10kb' })`).
- Rate limiting MUST be applied globally and with stricter limits on auth routes.

### 6. MongoDB Security

- Always use parameterized queries. Never concatenate user input into query objects.
- Use `$eq` operator explicitly when matching user-provided values:
  ```typescript
  // GOOD
  collection.findOne({ email: { $eq: userInput } });

  // BAD — vulnerable to NoSQL injection if userInput is an object
  collection.findOne({ email: userInput });
  ```
- All financial writes (transfers, deposits) MUST use MongoDB sessions with `session.withTransaction()`.

### 7. Sensitive Endpoints

- Transfer and deposit endpoints MUST require an `Idempotency-Key` header.
- The risk assessment service MUST have a timeout (3 seconds) and a fallback.
- Failed transactions MUST NOT partially execute — the MongoDB transaction ensures all-or-nothing.
