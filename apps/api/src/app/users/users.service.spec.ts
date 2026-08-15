import { ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let query: ReturnType<typeof vi.fn>;
  let usersService: UsersService;

  beforeEach(() => {
    query = vi.fn().mockResolvedValue({
      rows: [{ id: 'user-1', name: 'Sujeith', email: 'sujeith@example.com' }],
    });
    usersService = new UsersService({ query } as unknown as Pool);
  });

  it('normalizes email and sends only its Argon2 hash to PostgreSQL', async () => {
    await usersService.createUser({
      name: '  Sujeith  ',
      email: '  Sujeith@Example.COM  ',
      passwordHash: 'argon2-hash',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['Sujeith', 'sujeith@example.com', 'sujeith@example.com', 'argon2-hash'],
    );
  });

  it('returns a public user profile without passwordHash', async () => {
    await expect(
      usersService.createUser({
        name: 'Sujeith',
        email: 'sujeith@example.com',
        passwordHash: 'argon2-hash',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
    });
  });

  it('maps PostgreSQL unique violations to conflict responses', async () => {
    query.mockRejectedValueOnce({ code: '23505' });
    await expect(
      usersService.createUser({
        name: 'Sujeith',
        email: 'sujeith@example.com',
        passwordHash: 'argon2-hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a user by normalized email and maps the password hash', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          name: 'Sujeith',
          email: 'sujeith@example.com',
          password_hash: 'argon2-hash',
        },
      ],
    });
    await expect(
      usersService.findByEmailWithPasswordHash('  Sujeith@Example.COM  '),
    ).resolves.toMatchObject({ passwordHash: 'argon2-hash' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('email_normalized = $1'),
      ['sujeith@example.com'],
    );
  });
});
