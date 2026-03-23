# Rule: Error Handling

## Result Pattern

Services MUST return `Result<T, E>` instead of throwing exceptions. This makes error paths explicit and type-safe.

```typescript
// src/utils/result.ts
type Success<T> = { success: true; data: T };
type Failure<E> = { success: false; error: E };
type Result<T, E = AppError> = Success<T> | Failure<E>;

interface AppError {
  code: string;       // UPPER_SNAKE_CASE error code
  message: string;    // Human-readable, safe to send to client
  statusCode: number; // HTTP status code
}
```

## Rules

1. **Services never throw.** They return `Result<T, E>`. If an unexpected error occurs, catch it and return a `Failure`.

2. **Controllers map Result to HTTP.** If `result.success`, send `result.data` with the appropriate status code. If `!result.success`, send `result.error` with `result.error.statusCode`.

3. **Repositories may throw** on infrastructure failures (MongoDB connection lost). These are caught by the service layer and converted to a `Failure`.

4. **The global error handler** (`error-handler.middleware.ts`) catches any uncaught exceptions as a safety net. It logs the full error (including stack trace) and returns a generic `500` to the client with no internal details.

5. **Error codes are domain-specific**, not generic. Use:
   - `INVALID_CREDENTIALS` not `UNAUTHORIZED`
   - `INSUFFICIENT_FUNDS` not `BAD_REQUEST`
   - `ACCOUNT_NOT_FOUND` not `NOT_FOUND`
   - `TRANSFER_BLOCKED` not `FORBIDDEN`
   - `DUPLICATE_IDEMPOTENCY_KEY` not `CONFLICT`

6. **Never expose internal details** in error responses. No stack traces, no collection names, no field names from MongoDB errors.

7. **Validation errors** (from Zod) are caught by `validate.middleware.ts` and formatted as:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Validation failed",
       "details": [
         { "field": "amount", "message": "Expected positive integer" }
       ]
     }
   }
   ```
