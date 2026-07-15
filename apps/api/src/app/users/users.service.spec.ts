import { ConflictException } from '@nestjs/common';
import { Model } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService.createUser', () => {
  let userModel: Pick<Model<UserDocument>, 'create' | 'findOne'>;
  let usersService: UsersService;

  beforeEach(() => {
    userModel = {
      create: vi.fn().mockResolvedValue({
        _id: { toString: () => 'user-1' },
        name: 'Sujeith',
        email: 'sujeith@example.com',
      }),
      findOne: vi.fn(),
    } as unknown as Pick<Model<UserDocument>, 'create' | 'findOne'>;

    usersService = new UsersService(userModel as Model<UserDocument>);
  });

  it('normalizes email and stores only the password hash', async () => {
    await usersService.createUser({
      name: '  Sujeith  ',
      email: '  Sujeith@Example.COM  ',
      passwordHash: 'argon2-hash',
    });

    expect(userModel.create).toHaveBeenCalledWith({
      name: 'Sujeith',
      email: 'sujeith@example.com',
      emailNormalized: 'sujeith@example.com',
      passwordHash: 'argon2-hash',
    });
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

  it('maps duplicate email errors to conflict responses', async () => {
    vi.mocked(userModel.create).mockRejectedValueOnce({ code: 11000 });

    await expect(
      usersService.createUser({
        name: 'Sujeith',
        email: 'sujeith@example.com',
        passwordHash: 'argon2-hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a user by normalized email and includes passwordHash for login', async () => {
    const exec = vi.fn().mockResolvedValue({
      _id: { toString: () => 'user-1' },
      name: 'Sujeith',
      email: 'sujeith@example.com',
      passwordHash: 'argon2-hash',
    });
    const select = vi.fn().mockReturnValue({ exec });
    vi.mocked(userModel.findOne).mockReturnValue({ select } as never);

    await usersService.findByEmailWithPasswordHash('  Sujeith@Example.COM  ');

    expect(userModel.findOne).toHaveBeenCalledWith({
      emailNormalized: 'sujeith@example.com',
    });
    expect(select).toHaveBeenCalledWith('+passwordHash');
  });
});
