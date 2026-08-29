import { Module } from '@nestjs/common';
import { IdentityModule } from '../../domains/identity/public-api';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, MessagingModule, IdentityModule],
  controllers: [HealthController],
})
export class HealthModule {}
