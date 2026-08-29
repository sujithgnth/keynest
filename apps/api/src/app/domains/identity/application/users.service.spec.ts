import { ConflictException } from '@nestjs/common';
import { Db, MongoServerError } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDENTITY_COLLECTION_NAMES } from '../infrastructure/mongo/identity.collections';
import { UsersService } from './users.service';

describe('UsersService MongoDB persistence', () => {
  const users = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    users.insertOne.mockResolvedValue({ acknowledged: true });
    const database = {
      collection: vi.fn((name: string) => {
        if (name === IDENTITY_COLLECTION_NAMES.users) return users;
        return {};
      }),
    } as unknown as Db;
    service = new UsersService(database);
  });

  it('normalizes email and persists only the supplied Argon2 hash', async () => {
    await service.createUser({
      name: '  Sujeith  ',
      email: '  Sujeith@Example.COM  ',
      passwordHash: 'argon2-hash',
    });

    expect(users.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(String),
        name: 'Sujeith',
        email: 'sujeith@example.com',
        emailNormalized: 'sujeith@example.com',
        passwordHash: 'argon2-hash',
        status: 'active',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it('returns a public profile without passwordHash', async () => {
    const user = await service.createUser({
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash: 'argon2-hash',
    });

    expect(user).toMatchObject({
      id: expect.any(String),
      name: 'Sujeith',
      email: 'sujeith@example.com',
    });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('maps MongoDB duplicate-key failures to conflict responses', async () => {
    users.insertOne.mockRejectedValueOnce(
      new MongoServerError({ code: 11000, errmsg: 'duplicate email' }),
    );

    await expect(
      service.createUser({
        name: 'Sujeith',
        email: 'sujeith@example.com',
        passwordHash: 'argon2-hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds an active user by normalized email', async () => {
    users.findOne.mockResolvedValueOnce({
      _id: 'user-1',
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash: 'argon2-hash',
    });

    await expect(
      service.findByEmailWithPasswordHash('  Sujeith@Example.COM  '),
    ).resolves.toMatchObject({ passwordHash: 'argon2-hash' });
    expect(users.findOne).toHaveBeenCalledWith(
      { emailNormalized: 'sujeith@example.com', status: 'active' },
      { projection: { name: 1, email: 1, passwordHash: 1 } },
    );
  });
});
