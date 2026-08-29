import { randomUUID } from 'crypto';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureMongoSchema } from '../../../platform/database/mongo-schema';
import { UsersService } from './users.service';

const mongoUri = process.env.MONGODB_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('UsersService real MongoDB persistence', () => {
  const databaseName = `keynest_test_${randomUUID().replaceAll('-', '')}`;
  const client = new MongoClient(mongoUri ?? 'mongodb://unconfigured');
  const database = client.db(databaseName);

  beforeAll(async () => {
    await client.connect();
    await ensureMongoSchema(database);
  });

  afterAll(async () => {
    await database.dropDatabase();
    await client.close();
  });

  it('persists a normalized user, reads it back, and enforces uniqueness', async () => {
    const service = new UsersService(database);
    const input = {
      name: 'Persistence Test',
      email: '  Persistence@Test.Example  ',
      passwordHash: '$argon2id$synthetic-hash',
    };

    const created = await service.createUser(input);
    const stored = await service.findByEmailWithPasswordHash(input.email);

    expect(stored).toEqual({
      ...created,
      passwordHash: input.passwordHash,
    });
    await expect(service.createUser(input)).rejects.toMatchObject({
      status: 409,
    });
  });
});
