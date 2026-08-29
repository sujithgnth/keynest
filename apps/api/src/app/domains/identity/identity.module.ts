import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { ObservabilityModule } from '../../platform/observability/observability.module';
import { AuthService } from './application/auth.service';
import { SessionsService } from './application/sessions.service';
import { UsersService } from './application/users.service';
import {
  createRedisClient,
  REDIS_CLIENT,
} from './infrastructure/redis/redis-client.provider';
import { AuthRateLimitGuard } from './presentation/auth-rate-limit.guard';
import { AuthController } from './presentation/auth.controller';
import { CsrfGuard } from './presentation/csrf.guard';
import { SessionAuthGuard } from './presentation/session-auth.guard';
import { SessionsController } from './presentation/sessions.controller';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [DatabaseModule, ObservabilityModule],
  controllers: [AuthController, SessionsController, UsersController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
    },
    UsersService,
    SessionsService,
    AuthService,
    AuthRateLimitGuard,
    SessionAuthGuard,
    CsrfGuard,
  ],
  exports: [
    UsersService,
    SessionsService,
    AuthService,
    SessionAuthGuard,
    CsrfGuard,
    REDIS_CLIENT,
  ],
})
export class IdentityModule {}
