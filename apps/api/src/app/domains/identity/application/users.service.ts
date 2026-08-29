import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Db, MongoServerError } from 'mongodb';
import { MONGO_DATABASE } from '../../../platform/database/database.constants';
import { getIdentityCollections } from '../infrastructure/mongo/identity.collections';
import type { CreateUserInput } from './identity.inputs';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface UserWithPasswordHash extends PublicUser {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(MONGO_DATABASE) private readonly database: Db) {}

  async createUser(createUserDto: CreateUserInput): Promise<PublicUser> {
    const emailNormalized = this.normalizeEmail(createUserDto.email);
    const now = new Date();
    const user = {
      _id: randomUUID(),
      name: createUserDto.name.trim(),
      email: emailNormalized,
      emailNormalized,
      passwordHash: createUserDto.passwordHash,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await getIdentityCollections(this.database).users.insertOne(user);
      return this.toPublicUser({ id: user._id, ...user });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  toPublicUser(user: PublicUser): PublicUser {
    return { id: user.id, name: user.name, email: user.email };
  }

  async findByEmailWithPasswordHash(
    email: string,
  ): Promise<UserWithPasswordHash | null> {
    const user = await getIdentityCollections(this.database).users.findOne(
      { emailNormalized: this.normalizeEmail(email), status: 'active' },
      { projection: { name: 1, email: 1, passwordHash: 1 } },
    );
    return user
      ? {
          id: user._id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
        }
      : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await getIdentityCollections(this.database).users.findOne(
      { _id: id, status: 'active' },
      { projection: { name: 1, email: 1 } },
    );
    return user ? { id: user._id, name: user.name, email: user.email } : null;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return error instanceof MongoServerError && error.code === 11000;
  }
}
