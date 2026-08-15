import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { CreateUserDto } from './dto/create-user.dto';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface UserWithPasswordHash extends PublicUser {
  passwordHash: string;
}

interface PostgresError {
  code?: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createUser(createUserDto: CreateUserDto): Promise<PublicUser> {
    const emailNormalized = this.normalizeEmail(createUserDto.email);

    try {
      const result = await this.pool.query<PublicUser>(
        `INSERT INTO users (name, email, email_normalized, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email`,
        [
          createUserDto.name.trim(),
          emailNormalized,
          emailNormalized,
          createUserDto.passwordHash,
        ],
      );
      return this.toPublicUser(result.rows[0]);
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
    const result = await this.pool.query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
    }>(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email_normalized = $1 AND status = 'active'`,
      [this.normalizeEmail(email)],
    );
    const user = result.rows[0];
    return user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.password_hash,
        }
      : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const result = await this.pool.query<PublicUser>(
      `SELECT id, name, email
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as PostgresError).code === '23505'
    );
  }
}
