/**
 * Idempotency key value object.
 * Uniqueness is determined by the combination of key + method + path.
 * @module domain/value-objects/idempotency-key
 */

interface IdempotencyKeyValue {
  key: string;
  method: string;
  path: string;
}

export type { IdempotencyKeyValue };
