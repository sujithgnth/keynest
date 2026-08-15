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
import { Pool } from 'pg';

const apiUrl = process.env.API_URL ?? 'http://localhost:3333/api';
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://keynest:keynest@localhost:5433/keynest';
const runId = randomUUID();
const email = `smoke-${runId}@keynest.test`;
const accountPassword = `Account-${runId}!`;
const masterPassword = `Vault-${runId}-master!`;
const sentinel = `private-${runId}`;
const pool = new Pool({ connectionString: databaseUrl });
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
    const result = await pool.query<{ pending: string }>(
      `SELECT count(*)::text AS pending FROM outbox_events
       WHERE payload->>'actorUserId' = $1 AND published_at IS NULL`,
      [actorUserId],
    );
    const pending = Number(result.rows[0].pending);
    if (pending === 0) return 0;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return -1;
}

async function main() {
  const health = await request<{
    status: string;
    dependencies: Record<string, string>;
  }>('/health/ready');
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

  const leakage = await pool.query<{ matches: string }>(
    `SELECT (
       (SELECT count(*) FROM vault_items
        WHERE ciphertext ILIKE $1 OR nonce ILIKE $1) +
       (SELECT count(*) FROM audit_events
        WHERE metadata::text ILIKE $1) +
       (SELECT count(*) FROM outbox_events
        WHERE payload::text ILIKE $1)
     )::text AS matches`,
    [`%${sentinel}%`],
  );
  if (Number(leakage.rows[0].matches) !== 0) {
    throw new Error('Plaintext sentinel was found in server-side storage');
  }

  const audit = await request<unknown[]>('/audit-logs');
  const pendingOutbox = await waitForOutbox(userId);
  if (pendingOutbox !== 0) throw new Error('Outbox events were not published');

  process.stdout.write(
    `${JSON.stringify({
      health: health.status,
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
      await pool
        .query(`DELETE FROM outbox_events WHERE payload->>'actorUserId' = $1`, [
          userId,
        ])
        .catch(() => undefined);
      await pool
        .query('DELETE FROM audit_events WHERE actor_user_id = $1', [userId])
        .catch(() => undefined);
      await pool
        .query('DELETE FROM users WHERE id = $1', [userId])
        .catch(() => undefined);
    }
    await pool.end();
  });
