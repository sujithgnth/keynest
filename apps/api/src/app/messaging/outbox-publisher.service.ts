import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { KeyNestLogger } from '../observability/keynest-logger.service';
import { MetricsService } from '../observability/metrics.service';
import { RabbitPublisherService } from './rabbit-publisher.service';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly rabbit: RabbitPublisherService,
    private readonly logger: KeyNestLogger,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), 1_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async flush() {
    if (this.running) return;
    this.running = true;
    const client = await this.pool.connect().catch(() => null);
    if (!client) {
      this.running = false;
      return;
    }
    try {
      await client.query('BEGIN');
      const result = await client.query<{
        id: string;
        event_type: string;
        payload: unknown;
      }>(
        `SELECT id, event_type, payload
         FROM outbox_events
         WHERE published_at IS NULL AND available_at <= now()
         ORDER BY created_at
         LIMIT 20
         FOR UPDATE SKIP LOCKED`,
      );
      for (const event of result.rows) {
        await this.rabbit.publish(event.id, event.event_type, event.payload);
        await client.query(
          `UPDATE outbox_events SET published_at = now(), attempts = attempts + 1
           WHERE id = $1`,
          [event.id],
        );
        this.metrics.outboxPublished.inc();
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      this.metrics.outboxFailures.inc();
      this.logger.warning('outbox.flush.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      client.release();
      this.running = false;
    }
  }
}
