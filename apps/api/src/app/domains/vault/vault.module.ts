import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { AuditModule } from '../audit/public-api';
import { IdentityModule } from '../identity/public-api';
import { CredentialsService } from './application/credentials.service';
import { VaultService } from './application/vault.service';
import { CredentialsController } from './presentation/credentials.controller';
import { VaultController } from './presentation/vault.controller';

@Module({
  imports: [DatabaseModule, IdentityModule, AuditModule],
  controllers: [VaultController, CredentialsController],
  providers: [VaultService, CredentialsService],
  exports: [VaultService, CredentialsService],
})
export class VaultModule {}
