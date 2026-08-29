export interface Vault {
  id: string;
  ownerUserId: string;
  version: number;
  revision: number;
  kdfAlgorithm: 'PBKDF2-SHA256';
  kdfIterations: number;
  kdfSalt: string;
  wrapAlgorithm: 'AES-256-GCM';
  wrapNonce: string;
  wrappedKey: string;
  createdAt: Date;
  updatedAt: Date;
}
