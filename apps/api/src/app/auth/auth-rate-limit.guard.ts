import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Response } from 'express';
import { KeyNestRequest } from '../common/request-context';
import { KeyNestLogger } from '../observability/keynest-logger.service';
import { REDIS_CLIENT, RedisClient } from '../sessions/redis-client.provider';

const WINDOW_SECONDS = 60;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly logger: KeyNestLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.redis.isOpen) return true;

    const request = context.switchToHttp().getRequest<KeyNestRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const action =
      context.getHandler().name === 'register' ? 'register' : 'login';
    const limit = action === 'register' ? 5 : 10;
    const source = request.ip || request.socket.remoteAddress || 'unknown';
    const sourceHash = createHash('sha256').update(source).digest('hex');
    const key = `auth-rate:${action}:${sourceHash}`;

    try {
      const attempts = await this.redis.incr(key);
      if (attempts === 1) await this.redis.expire(key, WINDOW_SECONDS);
      if (attempts > limit) {
        response.setHeader('retry-after', String(WINDOW_SECONDS));
        throw new HttpException(
          'Too many authentication attempts. Try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warning('auth.rate_limit.unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }
}
