/**
 * Actions recorded in the immutable audit log.
 * @module domain/enums/audit-action
 */

enum AuditAction {
  REGISTER = "REGISTER",
  LOGIN = "LOGIN",
  TRANSFER = "TRANSFER",
  TRANSFER_FLAGGED = "TRANSFER_FLAGGED",
  DEPOSIT = "DEPOSIT",
  BLOCKED = "BLOCKED",
}

export { AuditAction };
