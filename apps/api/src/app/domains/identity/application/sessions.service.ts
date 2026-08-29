import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Db } from 'mongodb';
import { MONGO_DATABASE } from '../../../platform/database/database.constants';
import { KeyNestLogger } from '../../../platform/observability/keynest-logger.service';
import { SESSION_TTL_SECONDS } from '../domain/session-policy';
import { getIdentityCollections } from '../infrastructure/mongo/identity.collections';
import {
  REDIS_CLIENT,
  RedisClient,
} from '../infrastructure/redis/redis-client.provider';

export interface SessionRecord {
  id: string;
  userId: string;
  csrfTokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
}

export interface CreatedSession {
  sessionId: string;
  csrfToken: string;
  record: SessionRecord;
}

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient,
    @Inject(MONGO_DATABASE) private readonly database: Db,
    @Optional() private readonly logger?: KeyNestLogger,
  ) {}

  async onModuleInit() {
    try {
      if (!this.redisClient.isOpen) await this.redisClient.connect();
    } catch (error) {
      this.logger?.warning('redis.connection.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async onModuleDestroy() {
    if (this.redisClient.isOpen) await this.redisClient.quit();
  }

  async createSession(userId: string): Promise<CreatedSession> {
    const sessionId = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    const record: SessionRecord = {
      id: randomUUID(),
      userId,
      csrfTokenHash: this.hash(csrfToken),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
    };

    await getIdentityCollections(this.database).sessions.insertOne({
      _id: record.id,
      userId: record.userId,
      tokenHash: this.hashSessionId(sessionId),
      csrfTokenHash: record.csrfTokenHash,
      createdAt: now,
      expiresAt,
      lastUsedAt: now,
    });
    await this.cacheSession(sessionId, record);
    return { sessionId, csrfToken, record };
  }

  async getActiveSession(sessionId: string): Promise<SessionRecord | null> {
    const cacheKey = this.getSessionKey(sessionId);
    if (this.redisClient.isOpen) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          const record = JSON.parse(cached) as SessionRecord;
          const revokedAt = await this.redisClient.get(
            `sessions-revoked:${record.userId}`,
          );
          if (
            !revokedAt ||
            Date.parse(record.createdAt) > Date.parse(revokedAt)
          ) {
            return record;
          }
          await this.redisClient.del(cacheKey);
          return null;
        }
      } catch (error) {
        this.logger?.warning('redis.session_read.failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const now = new Date();
    const session = await getIdentityCollections(
      this.database,
    ).sessions.findOneAndUpdate(
      {
        tokenHash: this.hashSessionId(sessionId),
        revokedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { lastUsedAt: now } },
      { returnDocument: 'after' },
    );
    if (!session) return null;
    const record = this.toSessionRecord(session);
    await this.cacheSession(sessionId, record);
    return record;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await getIdentityCollections(this.database).sessions.updateOne(
      {
        tokenHash: this.hashSessionId(sessionId),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } },
    );
    if (this.redisClient.isOpen) {
      await this.redisClient
        .del(this.getSessionKey(sessionId))
        .catch(() => undefined);
    }
  }

  async rotateCsrfToken(sessionId: string): Promise<string> {
    const csrfToken = randomBytes(32).toString('base64url');
    const csrfTokenHash = this.hash(csrfToken);
    const result = await getIdentityCollections(
      this.database,
    ).sessions.updateOne(
      {
        tokenHash: this.hashSessionId(sessionId),
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { $set: { csrfTokenHash } },
    );
    if (!result.matchedCount) throw new Error('Active session not found');
    const record = await this.getActiveSessionFromDatabase(sessionId);
    if (record) await this.cacheSession(sessionId, record);
    return csrfToken;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await getIdentityCollections(this.database).sessions.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    // Cached records have a short TTL and still need deterministic revocation.
    // Store a revocation watermark checked by the guard's database fallback path.
    if (this.redisClient.isOpen) {
      await this.redisClient
        .set(`sessions-revoked:${userId}`, new Date().toISOString(), {
          EX: SESSION_TTL_SECONDS,
        })
        .catch(() => undefined);
    }
  }

  async listForUser(userId: string) {
    const sessions = await getIdentityCollections(this.database)
      .sessions.find(
        {
          userId,
          revokedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        },
        { projection: { createdAt: 1, expiresAt: 1, lastUsedAt: 1 } },
      )
      .sort({ lastUsedAt: -1 })
      .toArray();
    return sessions.map((session) => ({
      id: session._id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
    }));
  }

  getSessionKey(sessionId: string): string {
    return `sess:${this.hashSessionId(sessionId)}`;
  }

  hashSessionId(sessionId: string): string {
    return this.hash(sessionId);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async getActiveSessionFromDatabase(
    sessionId: string,
  ): Promise<SessionRecord | null> {
    const session = await getIdentityCollections(
      this.database,
    ).sessions.findOne({
      tokenHash: this.hashSessionId(sessionId),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    return session ? this.toSessionRecord(session) : null;
  }

  private toSessionRecord(session: {
    _id: string;
    userId: string;
    csrfTokenHash: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsedAt: Date;
  }): SessionRecord {
    return {
      id: session._id,
      userId: session.userId,
      csrfTokenHash: session.csrfTokenHash,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
    };
  }

  private async cacheSession(sessionId: string, record: SessionRecord) {
    if (!this.redisClient.isOpen) return;
    try {
      await this.redisClient.set(
        this.getSessionKey(sessionId),
        JSON.stringify(record),
        {
          EX: Math.max(
            1,
            Math.floor((Date.parse(record.expiresAt) - Date.now()) / 1000),
          ),
        },
      );
    } catch (error) {
      this.logger?.warning('redis.session_write.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
