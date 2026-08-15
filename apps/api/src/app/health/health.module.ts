import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { HealthController } from './health.controller';

@Module({ imports: [SessionsModule], controllers: [HealthController] })
export class HealthModule {}
