import type { Collection, Db } from 'mongodb';
import type { MongoDocument } from '../../../../platform/database/mongo-document';
import type { AuditLog } from '../../domain/audit-log.entity';
import type { OutboxEvent } from '../../domain/outbox-event.entity';

export type AuditLogDocument = MongoDocument<AuditLog>;
export type OutboxEventDocument = MongoDocument<OutboxEvent>;

export const AUDIT_COLLECTION_NAMES = {
  auditLogs: 'audit_logs',
  outboxEvents: 'outbox_events',
} as const;

export interface AuditCollections {
  auditLogs: Collection<AuditLogDocument>;
  outboxEvents: Collection<OutboxEventDocument>;
}

export function getAuditCollections(db: Db): AuditCollections {
  return {
    auditLogs: db.collection<AuditLogDocument>(
      AUDIT_COLLECTION_NAMES.auditLogs,
    ),
    outboxEvents: db.collection<OutboxEventDocument>(
      AUDIT_COLLECTION_NAMES.outboxEvents,
    ),
  };
}
