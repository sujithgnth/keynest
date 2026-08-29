import type { Collection, Db } from 'mongodb';
import type { MongoDocument } from '../../../../platform/database/mongo-document';
import type { CredentialItem } from '../../domain/credential-item.entity';
import type { Vault } from '../../domain/vault.entity';

export type VaultDocument = MongoDocument<Vault>;
export type CredentialItemDocument = MongoDocument<CredentialItem>;

export const VAULT_COLLECTION_NAMES = {
  vaults: 'vaults',
  credentialItems: 'credential_items',
} as const;

export interface VaultCollections {
  vaults: Collection<VaultDocument>;
  credentialItems: Collection<CredentialItemDocument>;
}

export function getVaultCollections(db: Db): VaultCollections {
  return {
    vaults: db.collection<VaultDocument>(VAULT_COLLECTION_NAMES.vaults),
    credentialItems: db.collection<CredentialItemDocument>(
      VAULT_COLLECTION_NAMES.credentialItems,
    ),
  };
}
