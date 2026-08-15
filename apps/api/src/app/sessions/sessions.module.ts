import { Global, Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { createRedisClient, REDIS_CLIENT } from './redis-client.provider';
import { SessionsService } from './sessions.service';

@Global()
@Module({
  controllers: [SessionsController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
    },
    SessionsService,
  ],
  exports: [SessionsService, REDIS_CLIENT],
})
export class SessionsModule {}
