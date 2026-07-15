import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export function createRedisClient() {
  return createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });
}

export type RedisClient = ReturnType<typeof createRedisClient>;
