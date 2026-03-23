/**
 * Audit log entity for the immutable audit trail.
 * Append-only: never updated or deleted.
 * @module domain/entities/audit-log
 */

import { ObjectId } from "mongodb";

import { AuditAction } from "../enums/audit-action.enum.js";

interface AuditLogDocument {
  _id: ObjectId;
  action: AuditAction;
  userId: ObjectId;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

export type { AuditLogDocument };
