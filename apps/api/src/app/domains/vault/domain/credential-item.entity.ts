export type CredentialItemType = 'login' | 'note' | 'card' | 'api-key';

export interface CredentialItem {
  id: string;
  vaultId: string;
  itemType: CredentialItemType;
  envelopeVersion: 1;
  nonce: string;
  ciphertext: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
