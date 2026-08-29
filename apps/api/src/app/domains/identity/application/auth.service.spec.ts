import * as argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';

describe('AuthService.register', () => {
  let usersService: Pick<
    UsersService,
    'createUser' | 'findByEmailWithPasswordHash' | 'toPublicUser'
  >;
  let sessionsService: Pick<SessionsService, 'createSession'>;
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      createUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Sujeith',
        email: 'sujeith@example.com',
      }),
      findByEmailWithPasswordHash: vi.fn(),
      toPublicUser: vi.fn(),
    };
    sessionsService = {
      createSession: vi.fn(),
    };
    authService = new AuthService(
      usersService as UsersService,
      sessionsService as SessionsService,
    );
  });

  it('hashes the password before creating the user', async () => {
    await authService.register({
      name: 'Sujeith',
      email: 'sujeith@example.com',
      password: 'correct horse battery',
    });

    expect(usersService.createUser).toHaveBeenCalledOnce();
    const createInput = vi.mocked(usersService.createUser).mock.calls[0][0];

    expect(createInput.passwordHash).not.toBe('correct horse battery');
    await expect(
      argon2.verify(createInput.passwordHash, 'correct horse battery'),
    ).resolves.toBe(true);
  });

  it('returns the safe user profile from user creation', async () => {
    await expect(
      authService.register({
        name: 'Sujeith',
        email: 'sujeith@example.com',
        password: 'correct horse battery',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
    });
  });
});

describe('AuthService.login', () => {
  let usersService: Pick<
    UsersService,
    'createUser' | 'findByEmailWithPasswordHash' | 'toPublicUser'
  >;
  let sessionsService: Pick<SessionsService, 'createSession'>;
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      createUser: vi.fn(),
      findByEmailWithPasswordHash: vi.fn(),
      toPublicUser: vi.fn().mockReturnValue({
        id: 'user-1',
        name: 'Sujeith',
        email: 'sujeith@example.com',
      }),
    };
    sessionsService = {
      createSession: vi.fn().mockResolvedValue({
        sessionId: 'session-id',
        csrfToken: 'csrf-token',
      }),
    };
    authService = new AuthService(
      usersService as UsersService,
      sessionsService as SessionsService,
    );
  });

  it('creates a session and returns a safe user profile for valid credentials', async () => {
    const passwordHash = await argon2.hash('correct horse battery');
    vi.mocked(usersService.findByEmailWithPasswordHash).mockResolvedValue({
      id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash,
    } as never);

    await expect(
      authService.login({
        email: 'sujeith@example.com',
        password: 'correct horse battery',
      }),
    ).resolves.toEqual({
      sessionId: 'session-id',
      csrfToken: 'csrf-token',
      user: {
        id: 'user-1',
        name: 'Sujeith',
        email: 'sujeith@example.com',
      },
    });
    expect(sessionsService.createSession).toHaveBeenCalledWith('user-1');
  });

  it('does not include passwordHash in the login response', async () => {
    const passwordHash = await argon2.hash('correct horse battery');
    vi.mocked(usersService.findByEmailWithPasswordHash).mockResolvedValue({
      id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash,
    } as never);

    const response = await authService.login({
      email: 'sujeith@example.com',
      password: 'correct horse battery',
    });

    expect(response).not.toHaveProperty('passwordHash');
    expect(response.sessionId).toBe('session-id');
    expect(response.csrfToken).toBe('csrf-token');
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it('throws a generic unauthorized error for an unknown email', async () => {
    vi.mocked(usersService.findByEmailWithPasswordHash).mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'correct horse battery',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws a generic unauthorized error for a wrong password', async () => {
    const passwordHash = await argon2.hash('correct horse battery');
    vi.mocked(usersService.findByEmailWithPasswordHash).mockResolvedValue({
      id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash,
    } as never);

    await expect(
      authService.login({
        email: 'sujeith@example.com',
        password: 'wrong horse battery',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
