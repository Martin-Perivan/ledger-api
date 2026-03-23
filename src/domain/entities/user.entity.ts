/**
 * User entity representing a registered person in the system.
 * A user can own multiple accounts.
 * @module domain/entities/user
 */

import { ObjectId } from "mongodb";

interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export type { UserDocument };
