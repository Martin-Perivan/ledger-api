/**
 * System-level constants for the ledger domain.
 * @module domain/constants
 */

import { ObjectId } from "mongodb";

/**
 * Virtual external account used as the debit side of deposit transactions.
 * Keeps the double-entry invariant intact without a real balance.
 */
const EXTERNAL_ACCOUNT_ID = new ObjectId("000000000000000000000000");

export { EXTERNAL_ACCOUNT_ID };
