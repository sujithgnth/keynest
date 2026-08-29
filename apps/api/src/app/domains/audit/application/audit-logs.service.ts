import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Db, MongoClient } from 'mongodb';
import {
  MONGO_CLIENT,
  MONGO_DATABASE,
} from '../../../platform/database/database.constants';
import type { AuditMetadata, AuditOutcome } from '../domain/audit-log.entity';
import { getAuditCollections } from '../infrastructure/mongo/audit.collections';

export type { AuditOutcome } from '../domain/audit-log.entity';

export interface RecordAuditEvent {
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome?: AuditOutcome;
  metadata?: AuditMetadata;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(MONGO_CLIENT) private readonly client: MongoClient,
    @Inject(MONGO_DATABASE) private readonly database: Db,
  ) {}

  async record(event: RecordAuditEvent): Promise<void> {
    const id = randomUUID();
    const occurredAt = new Date();
    const safeEvent = {
      id,
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome ?? 'success',
      metadata: event.metadata ?? {},
      occurredAt: occurredAt.toISOString(),
    };
    this.assertSafe(safeEvent);

    const collections = getAuditCollections(this.database);
    await this.client.withSession((session) =>
      session.withTransaction(
        async () => {
          await collections.auditLogs.insertOne(
            {
              _id: id,
              ...(event.actorUserId ? { actorUserId: event.actorUserId } : {}),
              action: event.action,
              targetType: event.targetType,
              ...(event.targetId ? { targetId: event.targetId } : {}),
              outcome: event.outcome ?? 'success',
              metadata: event.metadata ?? {},
              occurredAt,
            },
            { session },
          );
          await collections.outboxEvents.insertOne(
            {
              _id: randomUUID(),
              eventType: 'audit.created',
              payload: safeEvent,
              attempts: 0,
              availableAt: occurredAt,
              createdAt: occurredAt,
            },
            { session },
          );
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        },
      ),
    );
  }

  async listForUser(userId: string, limit = 50) {
    const events = await getAuditCollections(this.database)
      .auditLogs.find({ actorUserId: userId })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .toArray();
    return events.map((event) => ({
      id: event._id,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId ?? null,
      outcome: event.outcome,
      metadata: event.metadata,
      occurredAt: event.occurredAt.toISOString(),
    }));
  }

  private assertSafe(value: unknown): void {
    const serialized = JSON.stringify(value).toLowerCase();
    const forbidden = [
      'password',
      'ciphertext',
      'wrappedkey',
      'sessionid',
      'token',
      'authorization',
      'cookie',
    ];
    if (forbidden.some((field) => serialized.includes(`"${field}`))) {
      throw new Error('Sensitive field rejected from audit event');
    }
  }
}
