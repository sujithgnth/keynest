import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { MessagingModule } from '../../platform/messaging/messaging.module';
import { ObservabilityModule } from '../../platform/observability/observability.module';
import { IdentityModule } from '../identity/public-api';
import { AuditLogsService } from './application/audit-logs.service';
import { OutboxPublisherService } from './infrastructure/messaging/outbox-publisher.service';
import { AuditLogsController } from './presentation/audit-logs.controller';

@Module({
  imports: [
    DatabaseModule,
    MessagingModule,
    ObservabilityModule,
    IdentityModule,
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, OutboxPublisherService],
  exports: [AuditLogsService],
})
export class AuditModule {}
