import { describe, expect, it, vi } from 'vitest';
import { SESSION_TTL_SECONDS } from './session.constants';
import { RedisClient } from './redis-client.provider';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  it('stores session metadata under a hashed Redis key with a TTL', async () => {
    const redisClient = {
      set: vi.fn(),
      isOpen: true,
      connect: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClient;
    const sessionsService = new SessionsService(redisClient);

    const sessionId = await sessionsService.createSession('user-1');

    expect(sessionId).toBeTruthy();
    expect(sessionId).not.toContain('user-1');
    expect(redisClient.set).toHaveBeenCalledOnce();

    const [key, serializedSession, options] = vi.mocked(redisClient.set).mock
      .calls[0];
    const session = JSON.parse(serializedSession as string);

    expect(key).toBe(sessionsService.getSessionKey(sessionId));
    expect(key).toMatch(/^sess:[a-f0-9]{64}$/);
    expect(key).not.toContain(sessionId);
    expect(session).toMatchObject({
      userId: 'user-1',
    });
    expect(session.createdAt).toEqual(expect.any(String));
    expect(session.expiresAt).toEqual(expect.any(String));
    expect(session.lastUsedAt).toEqual(expect.any(String));
    expect(options).toEqual({ EX: SESSION_TTL_SECONDS });
  });
});
