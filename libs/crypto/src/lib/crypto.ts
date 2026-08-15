import type {
  CredentialPayload,
  EncryptedVaultItem,
  ItemType,
  VaultMetadata,
} from '@keynest/types';

export const VAULT_KDF_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface VaultBootstrapEnvelope {
  version: 1;
  kdfAlgorithm: 'PBKDF2-SHA256';
  kdfIterations: number;
  kdfSalt: string;
  wrapAlgorithm: 'AES-256-GCM';
  wrapNonce: string;
  wrappedKey: string;
}

export async function createVaultBootstrap(
  masterPassword: string,
): Promise<{ envelope: VaultBootstrapEnvelope; vaultKey: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveWrappingKey(
    masterPassword,
    salt,
    VAULT_KDF_ITERATIONS,
  );
  const vaultKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const vaultKey = await importVaultKey(vaultKeyBytes);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: encoder.encode('keynest:vault-key:v1'),
      tagLength: 128,
    },
    wrappingKey,
    vaultKeyBytes,
  );
  vaultKeyBytes.fill(0);
  return {
    envelope: {
      version: 1,
      kdfAlgorithm: 'PBKDF2-SHA256',
      kdfIterations: VAULT_KDF_ITERATIONS,
      kdfSalt: toBase64(salt),
      wrapAlgorithm: 'AES-256-GCM',
      wrapNonce: toBase64(nonce),
      wrappedKey: toBase64(new Uint8Array(wrapped)),
    },
    vaultKey,
  };
}

export async function unlockVault(
  masterPassword: string,
  metadata: Pick<
    VaultMetadata,
    'kdfSalt' | 'kdfIterations' | 'wrapNonce' | 'wrappedKey'
  >,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(
    masterPassword,
    fromBase64(metadata.kdfSalt),
    metadata.kdfIterations,
  );
  try {
    const rawKey = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(metadata.wrapNonce),
        additionalData: encoder.encode('keynest:vault-key:v1'),
        tagLength: 128,
      },
      wrappingKey,
      fromBase64(metadata.wrappedKey),
    );
    const bytes = new Uint8Array(rawKey);
    const key = await importVaultKey(bytes);
    bytes.fill(0);
    return key;
  } catch {
    throw new Error('Unable to unlock vault');
  }
}

export async function encryptCredential(
  vaultKey: CryptoKey,
  identity: {
    vaultId: string;
    itemId: string;
    itemType: ItemType;
    revision: number;
  },
  payload: CredentialPayload,
) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  try {
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: itemAad(identity),
        tagLength: 128,
      },
      vaultKey,
      plaintext,
    );
    return {
      envelopeVersion: 1 as const,
      nonce: toBase64(nonce),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptCredential(
  vaultKey: CryptoKey,
  item: Pick<
    EncryptedVaultItem,
    'id' | 'vaultId' | 'itemType' | 'revision' | 'nonce' | 'ciphertext'
  >,
): Promise<CredentialPayload> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(item.nonce),
        additionalData: itemAad({
          vaultId: item.vaultId,
          itemId: item.id,
          itemType: item.itemType,
          revision: item.revision,
        }),
        tagLength: 128,
      },
      vaultKey,
      fromBase64(item.ciphertext),
    );
    return JSON.parse(decoder.decode(plaintext)) as CredentialPayload;
  } catch {
    throw new Error('Credential authentication failed');
  }
}

export function generatePassword(length = 20): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
  const max = 256 - (256 % alphabet.length);
  let password = '';
  while (password.length < Math.min(Math.max(length, 12), 64)) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const value of bytes) {
      if (value < max && password.length < length)
        password += alphabet[value % alphabet.length];
    }
  }
  return password;
}

async function deriveWrappingKey(
  masterPassword: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const passwordBytes = encoder.encode(masterPassword.normalize('NFKC'));
  try {
    const material = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } finally {
    passwordBytes.fill(0);
  }
}

function importVaultKey(bytes: Uint8Array<ArrayBuffer>) {
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function itemAad(identity: {
  vaultId: string;
  itemId: string;
  itemType: ItemType;
  revision: number;
}) {
  return encoder.encode(
    `keynest:item:v1:${identity.vaultId}:${identity.itemId}:${identity.itemType}:${identity.revision}`,
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
