/**
 * Lifecycle status of a digital wallet account.
 * Only ACTIVE accounts can send or receive transfers.
 * @module domain/enums/account-status
 */

enum AccountStatus {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
}

export { AccountStatus };
