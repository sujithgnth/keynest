import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';

export type AuditOutcome = 'success' | 'failure';

export interface RecordAuditEvent {
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome?: AuditOutcome;
  metadata?: Record<string, string | number | boolean>;
}

@Injectable()
export class AuditLogsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async record(event: RecordAuditEvent): Promise<void> {
    const id = randomUUID();
    const occurredAt = new Date().toISOString();
    const safeEvent = {
      id,
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome ?? 'success',
      metadata: event.metadata ?? {},
      occurredAt,
    };
    this.assertSafe(safeEvent);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO audit_events
           (id, actor_user_id, action, target_type, target_id, outcome, metadata, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          event.actorUserId ?? null,
          event.action,
          event.targetType,
          event.targetId ?? null,
          event.outcome ?? 'success',
          JSON.stringify(event.metadata ?? {}),
          occurredAt,
        ],
      );
      await client.query(
        `INSERT INTO outbox_events (id, event_type, payload)
         VALUES ($1, 'audit.created', $2)`,
        [randomUUID(), JSON.stringify(safeEvent)],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listForUser(userId: string, limit = 50) {
    const result = await this.pool.query<{
      id: string;
      action: string;
      target_type: string;
      target_id: string | null;
      outcome: string;
      metadata: Record<string, unknown>;
      occurred_at: Date;
    }>(
      `SELECT id, action, target_type, target_id, outcome, metadata, occurred_at
       FROM audit_events
       WHERE actor_user_id = $1
       ORDER BY occurred_at DESC, id DESC
       LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 100)],
    );
    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      outcome: row.outcome,
      metadata: row.metadata,
      occurredAt: row.occurred_at.toISOString(),
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
