import type { CredentialItemType } from '../domain/credential-item.entity';

export interface BootstrapVaultInput {
  version: 1;
  kdfAlgorithm: 'PBKDF2-SHA256';
  kdfIterations: number;
  kdfSalt: string;
  wrapAlgorithm: 'AES-256-GCM';
  wrapNonce: string;
  wrappedKey: string;
}

export interface UpdateVaultInput {
  expectedRevision: number;
  wrapNonce: string;
  wrappedKey: string;
  kdfAlgorithm: 'PBKDF2-SHA256';
  kdfIterations: number;
  kdfSalt: string;
}

export interface CreateCredentialInput {
  id: string;
  itemType: CredentialItemType;
  envelopeVersion: 1;
  nonce: string;
  ciphertext: string;
}

export interface UpdateCredentialInput {
  expectedRevision: number;
  envelopeVersion: 1;
  nonce: string;
  ciphertext: string;
}
