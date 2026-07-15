import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  SESSION_TTL_SECONDS,
} from './session.constants';
import { REDIS_CLIENT, RedisClient } from './redis-client.provider';

export interface SessionRecord {
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
}

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClient,
  ) {}

  async onModuleInit() {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  async onModuleDestroy() {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    const session: SessionRecord = {
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
    };

    await this.redisClient.set(this.getSessionKey(sessionId), JSON.stringify(session), {
      EX: SESSION_TTL_SECONDS,
    });

    return sessionId;
  }

  getSessionKey(sessionId: string): string {
    return `sess:${this.hashSessionId(sessionId)}`;
  }

  hashSessionId(sessionId: string): string {
    return createHash('sha256').update(sessionId).digest('hex');
  }

  private generateSessionId(): string {
    return randomBytes(32).toString('base64url');
  }
}
