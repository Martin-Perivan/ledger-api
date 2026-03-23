/**
 * Account entity representing a digital wallet owned by a user.
 * Balance is stored in integer cents and updated atomically within MongoDB transactions.
 * @module domain/entities/account
 */

import { ObjectId } from "mongodb";

import { AccountStatus } from "../enums/account-status.enum.js";

interface AccountDocument {
  _id: ObjectId;
  userId: ObjectId;
  accountNumber: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type { AccountDocument };
