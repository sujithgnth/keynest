import { Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { IDENTITY_COLLECTION_NAMES } from '../infrastructure/mongo/identity.collections';
import { RedisClient } from '../infrastructure/redis/redis-client.provider';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  it('stores only hashes in MongoDB and caches safe metadata with a TTL', async () => {
    const redisClient = {
      set: vi.fn(),
      isOpen: true,
      connect: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClient;
    const sessions = { insertOne: vi.fn().mockResolvedValue({}) };
    const database = {
      collection: vi.fn((name: string) => {
        if (name === IDENTITY_COLLECTION_NAMES.sessions) return sessions;
        return {};
      }),
    } as unknown as Db;
    const service = new SessionsService(redisClient, database);

    const created = await service.createSession('user-1');

    expect(created.sessionId).toBeTruthy();
    expect(created.csrfToken).toBeTruthy();
    expect(created.sessionId).not.toContain('user-1');
    expect(sessions.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(String),
        userId: 'user-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        csrfTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      }),
    );
    expect(
      JSON.stringify(vi.mocked(sessions.insertOne).mock.calls),
    ).not.toContain(created.sessionId);
    expect(redisClient.set).toHaveBeenCalledOnce();
    const [key, serializedSession, options] = vi.mocked(redisClient.set).mock
      .calls[0];
    expect(key).toBe(service.getSessionKey(created.sessionId));
    expect(key).toMatch(/^sess:[a-f0-9]{64}$/);
    expect(JSON.parse(serializedSession as string)).toMatchObject({
      userId: 'user-1',
    });
    expect(options).toMatchObject({ EX: expect.any(Number) });
  });
});
