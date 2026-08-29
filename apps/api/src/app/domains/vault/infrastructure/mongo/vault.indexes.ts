import type { Db, IndexDescription } from 'mongodb';
import {
  getVaultCollections,
  VAULT_COLLECTION_NAMES,
} from './vault.collections';

const INDEXES: Record<string, IndexDescription[]> = {
  [VAULT_COLLECTION_NAMES.vaults]: [
    {
      key: { ownerUserId: 1 },
      name: 'vaults_owner_unique',
      unique: true,
    },
  ],
  [VAULT_COLLECTION_NAMES.credentialItems]: [
    {
      key: { vaultId: 1, updatedAt: -1, _id: -1 },
      name: 'credential_items_active_sync',
    },
  ],
};

export async function ensureVaultMongoSchema(db: Db): Promise<void> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
  for (const name of Object.values(VAULT_COLLECTION_NAMES)) {
    if (!existing.has(name)) await db.createCollection(name);
  }

  const collections = getVaultCollections(db);
  await Promise.all([
    collections.vaults.createIndexes(INDEXES[VAULT_COLLECTION_NAMES.vaults]),
    collections.credentialItems.createIndexes(
      INDEXES[VAULT_COLLECTION_NAMES.credentialItems],
    ),
  ]);
}
