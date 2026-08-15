export type ItemType = 'login' | 'note' | 'card' | 'api-key';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface VaultMetadata {
  id: string;
  version: 1;
  revision: number;
  kdfAlgorithm: 'PBKDF2-SHA256';
  kdfIterations: number;
  kdfSalt: string;
  wrapAlgorithm: 'AES-256-GCM';
  wrapNonce: string;
  wrappedKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedVaultItem {
  id: string;
  vaultId: string;
  itemType: ItemType;
  envelopeVersion: 1;
  nonce: string;
  ciphertext: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialPayload {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}
