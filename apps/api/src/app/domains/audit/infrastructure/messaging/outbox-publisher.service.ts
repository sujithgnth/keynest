import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGO_DATABASE } from '../../../../platform/database/database.constants';
import { RabbitPublisherService } from '../../../../platform/messaging/rabbit-publisher.service';
import { KeyNestLogger } from '../../../../platform/observability/keynest-logger.service';
import { MetricsService } from '../../../../platform/observability/metrics.service';
import { getAuditCollections } from '../mongo/audit.collections';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(MONGO_DATABASE) private readonly database: Db,
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
    try {
      const outbox = getAuditCollections(this.database).outboxEvents;
      for (let count = 0; count < 20; count += 1) {
        const claimedAt = new Date();
        const claimedUntil = new Date(claimedAt.getTime() + 30_000);
        const event = await outbox.findOneAndUpdate(
          {
            publishedAt: { $exists: false },
            availableAt: { $lte: claimedAt },
            $or: [
              { claimedUntil: { $exists: false } },
              { claimedUntil: { $lte: claimedAt } },
            ],
          },
          { $set: { claimedUntil }, $inc: { attempts: 1 } },
          { sort: { createdAt: 1 }, returnDocument: 'after' },
        );
        if (!event) break;

        try {
          await this.rabbit.publish(event._id, event.eventType, event.payload);
        } catch (error) {
          await outbox.updateOne(
            { _id: event._id, claimedUntil },
            { $unset: { claimedUntil: '' } },
          );
          throw error;
        }

        await outbox.updateOne(
          { _id: event._id, claimedUntil },
          {
            $set: { publishedAt: new Date() },
            $unset: { claimedUntil: '' },
          },
        );
        this.metrics.outboxPublished.inc();
      }
    } catch (error) {
      this.metrics.outboxFailures.inc();
      this.logger.warning('outbox.flush.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
