import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { KeyNestLogger } from '../observability/keynest-logger.service';
import { SESSION_TTL_SECONDS } from './session.constants';
import { REDIS_CLIENT, RedisClient } from './redis-client.provider';

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
    @Inject(PG_POOL) private readonly pool: Pool,
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

    await this.pool.query(
      `INSERT INTO sessions
         (id, user_id, token_hash, csrf_token_hash, created_at, expires_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        record.id,
        record.userId,
        this.hashSessionId(sessionId),
        record.csrfTokenHash,
        record.createdAt,
        record.expiresAt,
        record.lastUsedAt,
      ],
    );
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

    const result = await this.pool.query<{
      id: string;
      user_id: string;
      csrf_token_hash: string;
      created_at: Date;
      expires_at: Date;
      last_used_at: Date;
    }>(
      `UPDATE sessions
       SET last_used_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
       RETURNING id, user_id, csrf_token_hash, created_at, expires_at, last_used_at`,
      [this.hashSessionId(sessionId)],
    );
    const row = result.rows[0];
    if (!row) return null;
    const record: SessionRecord = {
      id: row.id,
      userId: row.user_id,
      csrfTokenHash: row.csrf_token_hash,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      lastUsedAt: row.last_used_at.toISOString(),
    };
    await this.cacheSession(sessionId, record);
    return record;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [this.hashSessionId(sessionId)],
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
    const result = await this.pool.query(
      `UPDATE sessions SET csrf_token_hash = $2
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [this.hashSessionId(sessionId), csrfTokenHash],
    );
    if (!result.rowCount) throw new Error('Active session not found');
    const record = await this.getActiveSessionFromDatabase(sessionId);
    if (record) await this.cacheSession(sessionId, record);
    return csrfToken;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
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
    const result = await this.pool.query<{
      id: string;
      created_at: Date;
      expires_at: Date;
      last_used_at: Date;
    }>(
      `SELECT id, created_at, expires_at, last_used_at
       FROM sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY last_used_at DESC`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      lastUsedAt: row.last_used_at.toISOString(),
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
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      csrf_token_hash: string;
      created_at: Date;
      expires_at: Date;
      last_used_at: Date;
    }>(
      `SELECT id, user_id, csrf_token_hash, created_at, expires_at, last_used_at
       FROM sessions
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [this.hashSessionId(sessionId)],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          csrfTokenHash: row.csrf_token_hash,
          createdAt: row.created_at.toISOString(),
          expiresAt: row.expires_at.toISOString(),
          lastUsedAt: row.last_used_at.toISOString(),
        }
      : null;
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
