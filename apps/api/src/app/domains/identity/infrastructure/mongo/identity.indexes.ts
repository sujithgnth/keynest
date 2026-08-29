import type { Db, IndexDescription } from 'mongodb';
import {
  getIdentityCollections,
  IDENTITY_COLLECTION_NAMES,
} from './identity.collections';

const INDEXES: Record<string, IndexDescription[]> = {
  [IDENTITY_COLLECTION_NAMES.users]: [
    {
      key: { emailNormalized: 1 },
      name: 'users_email_normalized_unique',
      unique: true,
    },
  ],
  [IDENTITY_COLLECTION_NAMES.sessions]: [
    {
      key: { tokenHash: 1 },
      name: 'sessions_token_hash_unique',
      unique: true,
    },
    {
      key: { userId: 1, revokedAt: 1, expiresAt: -1 },
      name: 'sessions_active_user',
    },
    {
      key: { expiresAt: 1 },
      name: 'sessions_expiry_ttl',
      expireAfterSeconds: 0,
    },
  ],
};

export async function ensureIdentityMongoSchema(db: Db): Promise<void> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
  for (const name of Object.values(IDENTITY_COLLECTION_NAMES)) {
    if (!existing.has(name)) await db.createCollection(name);
  }

  const collections = getIdentityCollections(db);
  await Promise.all([
    collections.users.createIndexes(INDEXES[IDENTITY_COLLECTION_NAMES.users]),
    collections.sessions.createIndexes(
      INDEXES[IDENTITY_COLLECTION_NAMES.sessions],
    ),
  ]);
}
