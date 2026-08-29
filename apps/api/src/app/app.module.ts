import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './domains/audit/public-api';
import { IdentityModule } from './domains/identity/public-api';
import { VaultModule } from './domains/vault/public-api';
import { DatabaseModule } from './platform/database/database.module';
import { HealthModule } from './platform/health/health.module';
import { MessagingModule } from './platform/messaging/messaging.module';
import { ObservabilityModule } from './platform/observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ObservabilityModule,
    MessagingModule,
    IdentityModule,
    AuditModule,
    VaultModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
