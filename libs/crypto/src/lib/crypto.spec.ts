import { describe, expect, it } from 'vitest';
import {
  createVaultBootstrap,
  decryptCredential,
  encryptCredential,
  unlockVault,
} from './crypto';

describe('browser vault cryptography', () => {
  it('wraps a vault key and authenticates encrypted credentials', async () => {
    const { envelope, vaultKey } = await createVaultBootstrap(
      'a sufficiently long master passphrase',
    );
    const unlocked = await unlockVault(
      'a sufficiently long master passphrase',
      envelope,
    );
    const identity = {
      vaultId: 'd8d64919-c736-49d5-8122-7a3d3ed78bc8',
      itemId: '1bdb9df3-1355-46f7-886b-faaaf82a63a9',
      itemType: 'login' as const,
      revision: 1,
    };
    const encrypted = await encryptCredential(vaultKey, identity, {
      title: 'Example',
      username: 'person@example.com',
      password: 'not-visible-to-the-api',
      url: 'https://example.com',
      notes: 'private',
    });

    await expect(
      decryptCredential(unlocked, {
        id: identity.itemId,
        vaultId: identity.vaultId,
        itemType: identity.itemType,
        revision: 1,
        ...encrypted,
      }),
    ).resolves.toMatchObject({
      title: 'Example',
      password: 'not-visible-to-the-api',
    });
    expect(JSON.stringify(encrypted)).not.toContain('not-visible-to-the-api');
  });

  it('rejects a wrong master password and tampered item identity', async () => {
    const { envelope, vaultKey } = await createVaultBootstrap(
      'the right master passphrase',
    );
    await expect(
      unlockVault('the wrong master passphrase', envelope),
    ).rejects.toThrow('Unable to unlock vault');

    const encrypted = await encryptCredential(
      vaultKey,
      {
        vaultId: 'd8d64919-c736-49d5-8122-7a3d3ed78bc8',
        itemId: '1bdb9df3-1355-46f7-886b-faaaf82a63a9',
        itemType: 'login',
        revision: 1,
      },
      {
        title: 'Example',
        username: '',
        password: 'secret',
        url: '',
        notes: '',
      },
    );
    await expect(
      decryptCredential(vaultKey, {
        id: '1bdb9df3-1355-46f7-886b-faaaf82a63a9',
        vaultId: 'd8d64919-c736-49d5-8122-7a3d3ed78bc8',
        itemType: 'login',
        revision: 2,
        ...encrypted,
      }),
    ).rejects.toThrow('Credential authentication failed');
  });
});
