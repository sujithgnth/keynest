import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PG_POOL } from '../database/database.constants';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

interface ItemRow {
  id: string;
  vault_id: string;
  item_type: string;
  envelope_version: number;
  nonce: string;
  ciphertext: string;
  revision: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditLogsService,
  ) {}

  async list(userId: string) {
    const result = await this.pool.query<ItemRow>(
      `SELECT i.id, i.vault_id, i.item_type, i.envelope_version, i.nonce,
              i.ciphertext, i.revision, i.created_at, i.updated_at
       FROM vault_items i
       JOIN vaults v ON v.id = i.vault_id
       WHERE v.owner_user_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.updated_at DESC, i.id DESC
       LIMIT 1000`,
      [userId],
    );
    return { items: result.rows.map((row) => this.map(row)) };
  }

  async create(userId: string, dto: CreateCredentialDto) {
    try {
      const result = await this.pool.query<ItemRow>(
        `INSERT INTO vault_items
           (id, vault_id, item_type, envelope_version, nonce, ciphertext, revision)
         SELECT $2, v.id, $3, $4, $5, $6, 1
         FROM vaults v WHERE v.owner_user_id = $1
         RETURNING id, vault_id, item_type, envelope_version, nonce, ciphertext,
                   revision, created_at, updated_at`,
        [
          userId,
          dto.id,
          dto.itemType,
          dto.envelopeVersion,
          dto.nonce,
          dto.ciphertext,
        ],
      );
      if (!result.rows[0]) throw new NotFoundException('Vault not found');
      const item = this.map(result.rows[0]);
      await this.audit.record({
        actorUserId: userId,
        action: 'vault_item.created',
        targetType: 'vault_item',
        targetId: item.id,
        metadata: { itemType: item.itemType, revision: item.revision },
      });
      return item;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Credential item already exists');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateCredentialDto) {
    const result = await this.pool.query<ItemRow>(
      `UPDATE vault_items i
       SET envelope_version = $3, nonce = $4, ciphertext = $5,
           revision = revision + 1, updated_at = now()
       FROM vaults v
       WHERE i.vault_id = v.id AND v.owner_user_id = $1 AND i.id = $2
         AND i.revision = $6 AND i.deleted_at IS NULL
       RETURNING i.id, i.vault_id, i.item_type, i.envelope_version, i.nonce,
                 i.ciphertext, i.revision, i.created_at, i.updated_at`,
      [
        userId,
        id,
        dto.envelopeVersion,
        dto.nonce,
        dto.ciphertext,
        dto.expectedRevision,
      ],
    );
    if (!result.rows[0]) {
      const exists = await this.pool.query(
        `SELECT 1 FROM vault_items i JOIN vaults v ON v.id = i.vault_id
         WHERE v.owner_user_id = $1 AND i.id = $2 AND i.deleted_at IS NULL`,
        [userId, id],
      );
      if (!exists.rowCount) throw new NotFoundException('Credential not found');
      throw new ConflictException(
        'Credential revision changed; reload and retry',
      );
    }
    const item = this.map(result.rows[0]);
    await this.audit.record({
      actorUserId: userId,
      action: 'vault_item.updated',
      targetType: 'vault_item',
      targetId: id,
      metadata: { itemType: item.itemType, revision: item.revision },
    });
    return item;
  }

  async remove(userId: string, id: string) {
    const result = await this.pool.query<{
      item_type: string;
      revision: number;
    }>(
      `UPDATE vault_items i
       SET deleted_at = now(), revision = revision + 1, updated_at = now()
       FROM vaults v
       WHERE i.vault_id = v.id AND v.owner_user_id = $1 AND i.id = $2
         AND i.deleted_at IS NULL
       RETURNING i.item_type, i.revision`,
      [userId, id],
    );
    if (!result.rows[0]) throw new NotFoundException('Credential not found');
    await this.audit.record({
      actorUserId: userId,
      action: 'vault_item.deleted',
      targetType: 'vault_item',
      targetId: id,
      metadata: {
        itemType: result.rows[0].item_type,
        revision: result.rows[0].revision,
      },
    });
    return { deleted: true };
  }

  private map(row: ItemRow) {
    return {
      id: row.id,
      vaultId: row.vault_id,
      itemType: row.item_type,
      envelopeVersion: row.envelope_version,
      nonce: row.nonce,
      ciphertext: row.ciphertext,
      revision: row.revision,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
