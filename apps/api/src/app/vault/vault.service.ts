import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PG_POOL } from '../database/database.constants';
import { BootstrapVaultDto } from './dto/bootstrap-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';

interface VaultRow {
  id: string;
  version: number;
  revision: number;
  kdf_algorithm: string;
  kdf_iterations: number;
  kdf_salt: string;
  wrap_algorithm: string;
  wrap_nonce: string;
  wrapped_key: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class VaultService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditLogsService,
  ) {}

  async getForUser(userId: string) {
    const result = await this.pool.query<VaultRow>(
      `SELECT id, version, revision, kdf_algorithm, kdf_iterations, kdf_salt,
              wrap_algorithm, wrap_nonce, wrapped_key, created_at, updated_at
       FROM vaults WHERE owner_user_id = $1`,
      [userId],
    );
    return result.rows[0] ? this.map(result.rows[0]) : null;
  }

  async bootstrap(userId: string, dto: BootstrapVaultDto) {
    try {
      const result = await this.pool.query<VaultRow>(
        `INSERT INTO vaults
           (id, owner_user_id, version, revision, kdf_algorithm, kdf_iterations,
            kdf_salt, wrap_algorithm, wrap_nonce, wrapped_key)
         VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9)
         RETURNING id, version, revision, kdf_algorithm, kdf_iterations, kdf_salt,
                   wrap_algorithm, wrap_nonce, wrapped_key, created_at, updated_at`,
        [
          randomUUID(),
          userId,
          dto.version,
          dto.kdfAlgorithm,
          dto.kdfIterations,
          dto.kdfSalt,
          dto.wrapAlgorithm,
          dto.wrapNonce,
          dto.wrappedKey,
        ],
      );
      const vault = this.map(result.rows[0]);
      await this.audit.record({
        actorUserId: userId,
        action: 'vault.created',
        targetType: 'vault',
        targetId: vault.id,
      });
      return vault;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Vault is already initialized');
      }
      throw error;
    }
  }

  async rotate(userId: string, dto: UpdateVaultDto) {
    const result = await this.pool.query<VaultRow>(
      `UPDATE vaults
       SET revision = revision + 1, kdf_algorithm = $2, kdf_iterations = $3,
           kdf_salt = $4, wrap_nonce = $5, wrapped_key = $6, updated_at = now()
       WHERE owner_user_id = $1 AND revision = $7
       RETURNING id, version, revision, kdf_algorithm, kdf_iterations, kdf_salt,
                 wrap_algorithm, wrap_nonce, wrapped_key, created_at, updated_at`,
      [
        userId,
        dto.kdfAlgorithm,
        dto.kdfIterations,
        dto.kdfSalt,
        dto.wrapNonce,
        dto.wrappedKey,
        dto.expectedRevision,
      ],
    );
    if (!result.rows[0]) {
      const exists = await this.getForUser(userId);
      if (!exists) throw new NotFoundException('Vault not found');
      throw new ConflictException('Vault revision changed; reload and retry');
    }
    await this.audit.record({
      actorUserId: userId,
      action: 'vault.key_rotated',
      targetType: 'vault',
      targetId: result.rows[0].id,
    });
    return this.map(result.rows[0]);
  }

  private map(row: VaultRow) {
    return {
      id: row.id,
      version: row.version,
      revision: row.revision,
      kdfAlgorithm: row.kdf_algorithm,
      kdfIterations: row.kdf_iterations,
      kdfSalt: row.kdf_salt,
      wrapAlgorithm: row.wrap_algorithm,
      wrapNonce: row.wrap_nonce,
      wrappedKey: row.wrapped_key,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
