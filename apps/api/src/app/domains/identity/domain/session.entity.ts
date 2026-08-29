export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
}
