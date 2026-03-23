/**
 * Actions recorded in the immutable audit log.
 * @module domain/enums/audit-action
 */

enum AuditAction {
  REGISTER = "REGISTER",
  LOGIN = "LOGIN",
  TRANSFER = "TRANSFER",
  DEPOSIT = "DEPOSIT",
  BLOCKED = "BLOCKED",
}

export { AuditAction };
