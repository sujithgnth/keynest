import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Response } from 'express';
import { Db } from 'mongodb';
import { REDIS_CLIENT, RedisClient } from '../../domains/identity/public-api';
import { MONGO_DATABASE } from '../database/database.constants';
import { RabbitPublisherService } from '../messaging/rabbit-publisher.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(MONGO_DATABASE) private readonly database: Db,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly rabbit: RabbitPublisherService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const database = await this.database
      .command({ ping: 1 })
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    const redis = this.redis.isOpen
      ? await this.redis
          .ping()
          .then(() => 'up' as const)
          .catch(() => 'down' as const)
      : ('down' as const);
    const rabbit = this.rabbit.isReady() ? 'up' : 'down';
    const status = [database, redis, rabbit].every(
      (dependency) => dependency === 'up',
    )
      ? 'ready'
      : 'unavailable';
    if (status === 'unavailable') response.status(503);
    return { status, dependencies: { database, redis, rabbit } };
  }
}
