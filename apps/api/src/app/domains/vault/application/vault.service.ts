import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Db, MongoServerError } from 'mongodb';
import { AuditLogsService } from '../../audit/public-api';
import { MONGO_DATABASE } from '../../../platform/database/database.constants';
import {
  getVaultCollections,
  VaultDocument,
} from '../infrastructure/mongo/vault.collections';
import type { BootstrapVaultInput, UpdateVaultInput } from './vault.inputs';

@Injectable()
export class VaultService {
  constructor(
    @Inject(MONGO_DATABASE) private readonly database: Db,
    private readonly audit: AuditLogsService,
  ) {}

  async getForUser(userId: string) {
    const vault = await getVaultCollections(this.database).vaults.findOne({
      ownerUserId: userId,
    });
    return vault ? this.map(vault) : null;
  }

  async bootstrap(userId: string, dto: BootstrapVaultInput) {
    const now = new Date();
    const vault: VaultDocument = {
      _id: randomUUID(),
      ownerUserId: userId,
      version: dto.version,
      revision: 1,
      kdfAlgorithm: dto.kdfAlgorithm,
      kdfIterations: dto.kdfIterations,
      kdfSalt: dto.kdfSalt,
      wrapAlgorithm: dto.wrapAlgorithm,
      wrapNonce: dto.wrapNonce,
      wrappedKey: dto.wrappedKey,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await getVaultCollections(this.database).vaults.insertOne(vault);
      const response = this.map(vault);
      await this.audit.record({
        actorUserId: userId,
        action: 'vault.created',
        targetType: 'vault',
        targetId: response.id,
      });
      return response;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Vault is already initialized');
      }
      throw error;
    }
  }

  async rotate(userId: string, dto: UpdateVaultInput) {
    const vault = await getVaultCollections(
      this.database,
    ).vaults.findOneAndUpdate(
      { ownerUserId: userId, revision: dto.expectedRevision },
      {
        $inc: { revision: 1 },
        $set: {
          kdfAlgorithm: dto.kdfAlgorithm,
          kdfIterations: dto.kdfIterations,
          kdfSalt: dto.kdfSalt,
          wrapNonce: dto.wrapNonce,
          wrappedKey: dto.wrappedKey,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!vault) {
      const exists = await this.getForUser(userId);
      if (!exists) throw new NotFoundException('Vault not found');
      throw new ConflictException('Vault revision changed; reload and retry');
    }
    await this.audit.record({
      actorUserId: userId,
      action: 'vault.key_rotated',
      targetType: 'vault',
      targetId: vault._id,
    });
    return this.map(vault);
  }

  private map(vault: VaultDocument) {
    return {
      id: vault._id,
      version: vault.version,
      revision: vault.revision,
      kdfAlgorithm: vault.kdfAlgorithm,
      kdfIterations: vault.kdfIterations,
      kdfSalt: vault.kdfSalt,
      wrapAlgorithm: vault.wrapAlgorithm,
      wrapNonce: vault.wrapNonce,
      wrappedKey: vault.wrappedKey,
      createdAt: vault.createdAt.toISOString(),
      updatedAt: vault.updatedAt.toISOString(),
    };
  }
}
