/**
 * Outcome status of a financial transaction.
 * COMPLETED: successfully executed. BLOCKED: rejected by fraud detection.
 * @module domain/enums/transaction-status
 */

enum TransactionStatus {
  COMPLETED = "COMPLETED",
  BLOCKED = "BLOCKED",
}

export { TransactionStatus };
