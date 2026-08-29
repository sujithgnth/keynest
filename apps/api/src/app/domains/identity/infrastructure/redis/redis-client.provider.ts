import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export function createRedisClient() {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required in production');
  }
  return createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6380',
  });
}

export type RedisClient = ReturnType<typeof createRedisClient>;
