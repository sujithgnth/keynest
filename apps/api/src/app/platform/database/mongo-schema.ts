import type { Db } from 'mongodb';
import { ensureAuditMongoSchema } from '../../domains/audit/infrastructure/mongo/audit.indexes';
import { ensureIdentityMongoSchema } from '../../domains/identity/infrastructure/mongo/identity.indexes';
import { ensureVaultMongoSchema } from '../../domains/vault/infrastructure/mongo/vault.indexes';

export async function ensureMongoSchema(db: Db): Promise<void> {
  await ensureIdentityMongoSchema(db);
  await ensureVaultMongoSchema(db);
  await ensureAuditMongoSchema(db);
}
