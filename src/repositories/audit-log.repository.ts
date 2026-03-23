/**
 * Repository for the auditLogs collection.
 * Append-only: exposes create method only — no update or delete.
 * @module repositories/audit-log
 */

import { Collection, Db, ObjectId, ClientSession } from "mongodb";

import { type AuditLogDocument } from "../domain/entities/audit-log.entity.js";
import { type AuditAction } from "../domain/enums/audit-action.enum.js";

class AuditLogRepository {
  private collection: Collection<AuditLogDocument>;

  constructor(db: Db) {
    this.collection = db.collection<AuditLogDocument>("auditLogs");
  }

  async create(
    data: {
      action: AuditAction;
      userId: ObjectId;
      metadata: Record<string, unknown>;
      ip: string;
      userAgent: string;
    },
    session?: ClientSession
  ): Promise<void> {
    await this.collection.insertOne(
      {
        _id: new ObjectId(),
        ...data,
        createdAt: new Date(),
      },
      { session }
    );
  }
}

export { AuditLogRepository };
