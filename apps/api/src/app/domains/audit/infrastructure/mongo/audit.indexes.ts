import type { Db, IndexDescription } from 'mongodb';
import {
  AUDIT_COLLECTION_NAMES,
  getAuditCollections,
} from './audit.collections';

const INDEXES: Record<string, IndexDescription[]> = {
  [AUDIT_COLLECTION_NAMES.auditLogs]: [
    {
      key: { actorUserId: 1, occurredAt: -1, _id: -1 },
      name: 'audit_logs_actor_time',
    },
    {
      key: { action: 1, occurredAt: -1 },
      name: 'audit_logs_action_time',
    },
  ],
  [AUDIT_COLLECTION_NAMES.outboxEvents]: [
    {
      key: { publishedAt: 1, availableAt: 1, claimedUntil: 1, createdAt: 1 },
      name: 'outbox_events_publishable',
    },
  ],
};

export async function ensureAuditMongoSchema(db: Db): Promise<void> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
  for (const name of Object.values(AUDIT_COLLECTION_NAMES)) {
    if (!existing.has(name)) await db.createCollection(name);
  }

  const collections = getAuditCollections(db);
  await Promise.all([
    collections.auditLogs.createIndexes(
      INDEXES[AUDIT_COLLECTION_NAMES.auditLogs],
    ),
    collections.outboxEvents.createIndexes(
      INDEXES[AUDIT_COLLECTION_NAMES.outboxEvents],
    ),
  ]);
}
