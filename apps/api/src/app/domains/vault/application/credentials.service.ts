import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Db, MongoServerError } from 'mongodb';
import { AuditLogsService } from '../../audit/public-api';
import { MONGO_DATABASE } from '../../../platform/database/database.constants';
import {
  CredentialItemDocument,
  getVaultCollections,
} from '../infrastructure/mongo/vault.collections';
import type {
  CreateCredentialInput,
  UpdateCredentialInput,
} from './vault.inputs';

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(MONGO_DATABASE) private readonly database: Db,
    private readonly audit: AuditLogsService,
  ) {}

  async list(userId: string) {
    const vault = await this.findOwnedVault(userId);
    if (!vault) return { items: [] };
    const items = await getVaultCollections(this.database)
      .credentialItems.find({
        vaultId: vault._id,
        deletedAt: { $exists: false },
      })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(1000)
      .toArray();
    return { items: items.map((item) => this.map(item)) };
  }

  async create(userId: string, dto: CreateCredentialInput) {
    const vault = await this.findOwnedVault(userId);
    if (!vault) throw new NotFoundException('Vault not found');
    const now = new Date();
    const item: CredentialItemDocument = {
      _id: dto.id,
      vaultId: vault._id,
      itemType: dto.itemType,
      envelopeVersion: dto.envelopeVersion,
      nonce: dto.nonce,
      ciphertext: dto.ciphertext,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await getVaultCollections(this.database).credentialItems.insertOne(item);
      const response = this.map(item);
      await this.audit.record({
        actorUserId: userId,
        action: 'vault_item.created',
        targetType: 'vault_item',
        targetId: response.id,
        metadata: {
          itemType: response.itemType,
          revision: response.revision,
        },
      });
      return response;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Credential item already exists');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateCredentialInput) {
    const vault = await this.findOwnedVault(userId);
    if (!vault) throw new NotFoundException('Credential not found');
    const items = getVaultCollections(this.database).credentialItems;
    const item = await items.findOneAndUpdate(
      {
        _id: id,
        vaultId: vault._id,
        revision: dto.expectedRevision,
        deletedAt: { $exists: false },
      },
      {
        $inc: { revision: 1 },
        $set: {
          envelopeVersion: dto.envelopeVersion,
          nonce: dto.nonce,
          ciphertext: dto.ciphertext,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!item) {
      const exists = await items.findOne({
        _id: id,
        vaultId: vault._id,
        deletedAt: { $exists: false },
      });
      if (!exists) throw new NotFoundException('Credential not found');
      throw new ConflictException(
        'Credential revision changed; reload and retry',
      );
    }
    const response = this.map(item);
    await this.audit.record({
      actorUserId: userId,
      action: 'vault_item.updated',
      targetType: 'vault_item',
      targetId: id,
      metadata: {
        itemType: response.itemType,
        revision: response.revision,
      },
    });
    return response;
  }

  async remove(userId: string, id: string) {
    const vault = await this.findOwnedVault(userId);
    if (!vault) throw new NotFoundException('Credential not found');
    const now = new Date();
    const item = await getVaultCollections(
      this.database,
    ).credentialItems.findOneAndUpdate(
      { _id: id, vaultId: vault._id, deletedAt: { $exists: false } },
      {
        $inc: { revision: 1 },
        $set: { deletedAt: now, updatedAt: now },
      },
      { returnDocument: 'after' },
    );
    if (!item) throw new NotFoundException('Credential not found');
    await this.audit.record({
      actorUserId: userId,
      action: 'vault_item.deleted',
      targetType: 'vault_item',
      targetId: id,
      metadata: {
        itemType: item.itemType,
        revision: item.revision,
      },
    });
    return { deleted: true };
  }

  private findOwnedVault(userId: string) {
    return getVaultCollections(this.database).vaults.findOne(
      { ownerUserId: userId },
      { projection: { _id: 1 } },
    );
  }

  private map(item: CredentialItemDocument) {
    return {
      id: item._id,
      vaultId: item.vaultId,
      itemType: item.itemType,
      envelopeVersion: item.envelopeVersion,
      nonce: item.nonce,
      ciphertext: item.ciphertext,
      revision: item.revision,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
