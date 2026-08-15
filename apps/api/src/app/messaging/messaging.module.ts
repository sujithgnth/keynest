import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ObservabilityModule } from '../observability/observability.module';
import { OutboxPublisherService } from './outbox-publisher.service';
import { RabbitPublisherService } from './rabbit-publisher.service';

@Global()
@Module({
  imports: [DatabaseModule, ObservabilityModule],
  providers: [RabbitPublisherService, OutboxPublisherService],
  exports: [RabbitPublisherService],
})
export class MessagingModule {}
