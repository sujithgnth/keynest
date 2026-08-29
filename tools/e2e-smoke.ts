import {
  createVaultBootstrap,
  decryptCredential,
  encryptCredential,
} from '@keynest/crypto';
import type {
  EncryptedVaultItem,
  PublicUser,
  VaultMetadata,
} from '@keynest/types';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { getAuditCollections } from '../apps/api/src/app/domains/audit/infrastructure/mongo/audit.collections';
import { getIdentityCollections } from '../apps/api/src/app/domains/identity/infrastructure/mongo/identity.collections';
import { getVaultCollections } from '../apps/api/src/app/domains/vault/infrastructure/mongo/vault.collections';

const apiUrl = process.env.API_URL ?? 'http://localhost:3333/api';
const mongoUrl =
  process.env.MONGODB_URI ??
  'mongodb://localhost:27018/keynest?replicaSet=rs0&directConnection=true';
const runId = randomUUID();
const email = `smoke-${runId}@keynest.test`;
const accountPassword = `Account-${runId}!`;
const masterPassword = `Vault-${runId}-master!`;
const sentinel = `private-${runId}`;
const mongo = new MongoClient(mongoUrl, { appName: 'keynest-e2e' });
const database = mongo.db(process.env.MONGODB_DATABASE ?? 'keynest');
const collections = {
  ...getIdentityCollections(database),
  ...getVaultCollections(database),
  ...getAuditCollections(database),
};
let cookie = '';
let csrfToken = '';
let userId = '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(csrfToken ? { 'x-keynest-csrf': csrfToken } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  return response.json() as Promise<T>;
}

async function waitForOutbox(actorUserId: string): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pending = await collections.outboxEvents.countDocuments({
      'payload.actorUserId': actorUserId,
      publishedAt: { $exists: false },
    });
    if (pending === 0) return 0;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return -1;
}

async function main() {
  await mongo.connect();
  const healthResponse = await fetch(`${apiUrl}/health/ready`);
  if (!healthResponse.ok) {
    throw new Error(
      `GET /health/ready failed (${healthResponse.status}): ${await healthResponse.text()}`,
    );
  }
  const contentSecurityPolicy = healthResponse.headers.get(
    'content-security-policy',
  );
  const requiredDirectives = [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ];
  if (
    !contentSecurityPolicy ||
    requiredDirectives.some(
      (directive) => !contentSecurityPolicy.includes(directive),
    )
  ) {
    throw new Error(
      `API Content-Security-Policy is missing required directives: ${contentSecurityPolicy ?? 'missing'}`,
    );
  }
  const health = (await healthResponse.json()) as {
    status: string;
    dependencies: Record<string, string>;
  };
  if (
    health.status !== 'ready' ||
    Object.values(health.dependencies).some((value) => value !== 'up')
  ) {
    throw new Error(`Dependencies are not ready: ${JSON.stringify(health)}`);
  }

  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Smoke Test',
      email,
      password: accountPassword,
    }),
  });
  const login = await request<{
    user: PublicUser;
    csrfToken: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: accountPassword }),
  });
  userId = login.user.id;
  csrfToken = login.csrfToken;

  const bootstrap = await createVaultBootstrap(masterPassword);
  const vault = await request<VaultMetadata>('/vault', {
    method: 'POST',
    body: JSON.stringify(bootstrap.envelope),
  });
  const itemId = randomUUID();
  const payload = {
    title: `Smoke ${sentinel}`,
    username: `${sentinel}@example.test`,
    password: `Secret-${sentinel}`,
    url: 'https://example.test',
    notes: `Notes ${sentinel}`,
  };
  const encrypted = await encryptCredential(
    bootstrap.vaultKey,
    { vaultId: vault.id, itemId, itemType: 'login', revision: 1 },
    payload,
  );
  await request('/credentials', {
    method: 'POST',
    body: JSON.stringify({ id: itemId, itemType: 'login', ...encrypted }),
  });

  const listed = await request<{ items: EncryptedVaultItem[] }>('/credentials');
  const storedItem = listed.items.find((item) => item.id === itemId);
  if (!storedItem) throw new Error('Created credential was not returned');
  const decrypted = await decryptCredential(bootstrap.vaultKey, storedItem);
  if (JSON.stringify(decrypted) !== JSON.stringify(payload)) {
    throw new Error('Decrypted credential does not match the original payload');
  }

  const serverDocuments = await Promise.all([
    collections.vaults.findOne({ _id: vault.id }),
    collections.credentialItems.findOne({ _id: itemId }),
    collections.auditLogs.find({ actorUserId: userId }).toArray(),
    collections.outboxEvents.find({ 'payload.actorUserId': userId }).toArray(),
  ]);
  if (JSON.stringify(serverDocuments).includes(sentinel)) {
    throw new Error('Plaintext sentinel was found in server-side storage');
  }

  const audit = await request<unknown[]>('/audit-logs');
  const pendingOutbox = await waitForOutbox(userId);
  if (pendingOutbox !== 0) throw new Error('Outbox events were not published');

  process.stdout.write(
    `${JSON.stringify({
      health: health.status,
      apiContentSecurityPolicy: true,
      registered: true,
      vaultRoundTrip: true,
      plaintextServerMatches: 0,
      auditEvents: audit.length,
      outboxPending: pendingOutbox,
    })}\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `E2E smoke test failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (userId) {
      const vault = await collections.vaults.findOne(
        { ownerUserId: userId },
        { projection: { _id: 1 } },
      );
      if (vault) {
        await collections.credentialItems
          .deleteMany({ vaultId: vault._id })
          .catch(() => undefined);
        await collections.vaults
          .deleteOne({ _id: vault._id })
          .catch(() => undefined);
      }
      await Promise.all([
        collections.outboxEvents
          .deleteMany({ 'payload.actorUserId': userId })
          .catch(() => undefined),
        collections.auditLogs
          .deleteMany({ actorUserId: userId })
          .catch(() => undefined),
        collections.sessions.deleteMany({ userId }).catch(() => undefined),
        collections.users.deleteOne({ _id: userId }).catch(() => undefined),
      ]);
    }
    await mongo.close();
  });
