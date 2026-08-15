import { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { RedisClient } from './redis-client.provider';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  it('stores only a session hash in PostgreSQL and caches safe metadata with a TTL', async () => {
    const redisClient = {
      set: vi.fn(),
      isOpen: true,
      connect: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClient;
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;
    const service = new SessionsService(redisClient, pool);

    const created = await service.createSession('user-1');

    expect(created.sessionId).toBeTruthy();
    expect(created.csrfToken).toBeTruthy();
    expect(created.sessionId).not.toContain('user-1');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
      [
        expect.any(String),
        'user-1',
        expect.stringMatching(/^[a-f0-9]{64}$/),
        expect.stringMatching(/^[a-f0-9]{64}$/),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ],
    );
    expect(JSON.stringify(vi.mocked(pool.query).mock.calls)).not.toContain(
      created.sessionId,
    );
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
