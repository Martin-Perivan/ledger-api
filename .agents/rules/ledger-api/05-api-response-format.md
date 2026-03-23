# Rule: API Response Format

## Standard Response Envelope

Every API response MUST follow this envelope structure. No exceptions.

### Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
}
```

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: true; // NOTE: this is wrong, see below
  error: {
    code: string;
    message: string;
    details?: ValidationDetail[];
  };
}

interface ValidationDetail {
  field: string;
  message: string;
}
```

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Account does not have enough balance for this transfer."
  }
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}
```

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3
    }
  }
}
```

## Controller Response Helpers

Controllers MUST use helper functions to build responses. Never construct the envelope manually.

```typescript
// src/utils/response.ts

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, error: AppError): void {
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: { page: number; limit: number; totalItems: number }
): void {
  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.totalItems / pagination.limit),
      },
    },
  });
}
```

## HTTP Status Code Rules

| Action                    | Status Code | When                                      |
| ------------------------- | ----------- | ----------------------------------------- |
| Resource created          | `201`       | POST that creates (register, account, transfer, deposit) |
| Resource retrieved        | `200`       | GET requests, login (returns token)        |
| Validation failed         | `400`       | Zod schema rejection                       |
| Not authenticated         | `401`       | Missing or invalid JWT                     |
| Not authorized / blocked  | `403`       | Wrong owner, transfer blocked by fraud     |
| Not found                 | `404`       | Resource does not exist                    |
| Duplicate resource        | `409`       | Email exists, duplicate idempotency key    |
| Business rule violated    | `422`       | Insufficient funds, self-transfer, inactive account |
| Rate limited              | `429`       | Too many requests                          |
| Server error              | `500`       | Unexpected failure (never expose details)  |

## Required Response Headers

Every response MUST include (handled by middleware):

| Header                     | Value                            |
| -------------------------- | -------------------------------- |
| `Content-Type`             | `application/json; charset=utf-8`|
| `X-Request-Id`             | UUID v4 generated per request    |
| `X-Response-Time`          | Duration in ms (e.g., `45ms`)   |
| `Cache-Control`            | `no-store` (financial data)      |

The `X-Request-Id` is generated in a middleware at the start of the request chain and attached to `req` for logging correlation.

```typescript
// src/middleware/request-id.middleware.ts
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
```

## Rules for Controllers

1. **Never return raw MongoDB documents.** Map them to response DTOs that exclude internal fields (`_id` mapped to `accountId`, `passwordHash` excluded).
2. **Never return `null` in the data field.** If a resource is not found, return a 404 error response.
3. **Always use the response helpers** (`sendSuccess`, `sendError`, `sendPaginated`). No inline `res.json()`.
4. **Dates are returned as ISO 8601 strings** (MongoDB `Date` objects serialize to ISO by default in JSON).
5. **Amounts are always integers (cents)** in both requests and responses. Never convert to decimal in the API layer.
