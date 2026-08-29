import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { KeyNestLogger } from '../../../platform/observability/keynest-logger.service';
import { RedisClient } from '../infrastructure/redis/redis-client.provider';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

function context(handlerName: 'login' | 'register') {
  const response = { setHeader: vi.fn() };
  const handler =
    handlerName === 'register'
      ? function register() {
          return undefined;
        }
      : function login() {
          return undefined;
        };
  return {
    response,
    value: {
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', socket: {} }),
        getResponse: () => response,
      }),
    },
  };
}

describe('AuthRateLimitGuard', () => {
  it('rejects login attempts above the per-minute limit', async () => {
    const redis = {
      isOpen: true,
      incr: vi.fn().mockResolvedValue(11),
      expire: vi.fn(),
    };
    const logger = { warning: vi.fn() };
    const guard = new AuthRateLimitGuard(
      redis as unknown as RedisClient,
      logger as unknown as KeyNestLogger,
    );
    const testContext = context('login');

    await expect(guard.canActivate(testContext.value as never)).rejects.toThrow(
      HttpException,
    );
    expect(testContext.response.setHeader).toHaveBeenCalledWith(
      'retry-after',
      '60',
    );
  });

  it('fails open and logs when Redis is unavailable during a request', async () => {
    const redis = {
      isOpen: true,
      incr: vi.fn().mockRejectedValue(new Error('redis unavailable')),
      expire: vi.fn(),
    };
    const logger = { warning: vi.fn() };
    const guard = new AuthRateLimitGuard(
      redis as unknown as RedisClient,
      logger as unknown as KeyNestLogger,
    );

    await expect(
      guard.canActivate(context('register').value as never),
    ).resolves.toBe(true);
    expect(logger.warning).toHaveBeenCalledWith(
      'auth.rate_limit.unavailable',
      expect.any(Object),
    );
  });
});
