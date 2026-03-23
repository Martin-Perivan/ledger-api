/**
 * Result pattern for explicit error handling in services.
 * Services return Result<T, E> instead of throwing exceptions.
 * @module utils/result
 */

interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: ValidationDetail[];
}

interface ValidationDetail {
  field: string;
  message: string;
}

type Success<T> = { success: true; data: T };
type Failure<E> = { success: false; error: E };
type Result<T, E = AppError> = Success<T> | Failure<E>;

function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export { success, failure };
export type { Result, AppError, ValidationDetail, Success, Failure };
