import { describe, expect, it, vi } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '../sessions/session.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController.login', () => {
  it('sets the session cookie and returns only the safe user profile', async () => {
    const authService = {
      login: vi.fn().mockResolvedValue({
        sessionId: 'raw-session-id',
        csrfToken: 'csrf-token',
        user: {
          id: 'user-1',
          name: 'Sujeith',
          email: 'sujeith@example.com',
        },
      }),
    };
    const response = {
      cookie: vi.fn(),
    };
    const controller = new AuthController(
      authService as unknown as AuthService,
      {} as never,
    );

    await expect(
      controller.login(
        {
          email: 'sujeith@example.com',
          password: 'correct horse battery',
        },
        response as never,
      ),
    ).resolves.toEqual({
      csrfToken: 'csrf-token',
      user: {
        id: 'user-1',
        name: 'Sujeith',
        email: 'sujeith@example.com',
      },
    });

    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'raw-session-id',
      {
        httpOnly: true,
        maxAge: SESSION_TTL_MS,
        path: '/api',
        sameSite: 'lax',
        secure: false,
      },
    );
  });
});
