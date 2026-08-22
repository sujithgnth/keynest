'use client';

import {
  createVaultBootstrap,
  decryptCredential,
  encryptCredential,
  generatePassword,
  unlockVault,
} from '@keynest/crypto';
import type {
  CredentialPayload,
  EncryptedVaultItem,
  ItemType,
  PublicUser,
  VaultMetadata,
} from '@keynest/types';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
type Screen = 'loading' | 'auth' | 'locked' | 'setup' | 'vault';
type DecryptedItem = {
  envelope: EncryptedVaultItem;
  payload: CredentialPayload;
};

export function VaultApp() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [vault, setVault] = useState<VaultMetadata | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const response = await fetch(`${API_URL}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          ...(csrfToken ? { 'x-keynest-csrf': csrfToken } : {}),
          ...init.headers,
        },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string | string[] };
        } | null;
        const message = payload?.error?.message;
        throw new Error(
          Array.isArray(message)
            ? message.join(', ')
            : (message ?? 'Request failed'),
        );
      }
      return response.json() as Promise<T>;
    },
    [csrfToken],
  );

  const loadVault = useCallback(async () => {
    const { vault: metadata } = await api<{ vault: VaultMetadata | null }>(
      '/vault',
    );
    setVault(metadata);
    setScreen(metadata ? 'locked' : 'setup');
  }, [api]);

  useEffect(() => {
    void fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No active session');
        return response.json() as Promise<{
          user: PublicUser;
          csrfToken: string;
        }>;
      })
      .then((session) => {
        setUser(session.user);
        setCsrfToken(session.csrfToken);
      })
      .catch(() => setScreen('auth'));
  }, []);

  useEffect(() => {
    if (user && csrfToken && screen === 'loading') void loadVault();
  }, [csrfToken, loadVault, screen, user]);

  const lock = useCallback(() => {
    setVaultKey(null);
    setItems([]);
    setScreen(vault ? 'locked' : 'setup');
    setNotice('Vault locked. Decrypted data was removed from app state.');
  }, [vault]);

  useEffect(() => {
    if (screen !== 'vault') return;
    const reset = () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(lock, 15 * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown', 'visibilitychange'];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();
    return () => {
      events.forEach((event) => window.removeEventListener(event, reset));
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [lock, screen]);

  async function authenticate(
    mode: 'login' | 'register',
    values: Record<string, string>,
  ) {
    setBusy(true);
    setNotice('');
    try {
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        setNotice('Account created. Sign in to create your encrypted vault.');
        return;
      }
      const session = await api<{ user: PublicUser; csrfToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(values),
        },
      );
      setUser(session.user);
      setCsrfToken(session.csrfToken);
      const { vault: metadata } = await fetch(`${API_URL}/vault`, {
        credentials: 'include',
      }).then(
        (response) =>
          response.json() as Promise<{ vault: VaultMetadata | null }>,
      );
      setVault(metadata);
      setScreen(metadata ? 'locked' : 'setup');
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Authentication failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function setupVault(masterPassword: string) {
    setBusy(true);
    setNotice('Deriving your vault key…');
    try {
      const created = await createVaultBootstrap(masterPassword);
      const metadata = await api<VaultMetadata>('/vault', {
        method: 'POST',
        body: JSON.stringify(created.envelope),
      });
      setVault(metadata);
      setVaultKey(created.vaultKey);
      setItems([]);
      setScreen('vault');
      setNotice('Vault created. The master password never left this browser.');
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to create vault',
      );
    } finally {
      setBusy(false);
    }
  }

  async function unlock(masterPassword: string) {
    if (!vault) return;
    setBusy(true);
    setNotice('Unlocking and decrypting locally…');
    try {
      const key = await unlockVault(masterPassword, vault);
      const response = await api<{ items: EncryptedVaultItem[] }>(
        '/credentials',
      );
      const decrypted = await Promise.all(
        response.items.map(async (envelope) => ({
          envelope,
          payload: await decryptCredential(key, envelope),
        })),
      );
      setVaultKey(key);
      setItems(decrypted);
      setScreen('vault');
      setNotice(
        `${decrypted.length} encrypted item${decrypted.length === 1 ? '' : 's'} unlocked locally.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to unlock vault',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveCredential(
    payload: CredentialPayload,
    existing?: DecryptedItem,
  ) {
    if (!vault || !vaultKey) return;
    setBusy(true);
    setNotice('Encrypting locally…');
    try {
      const id = existing?.envelope.id ?? crypto.randomUUID();
      const revision = existing ? existing.envelope.revision + 1 : 1;
      const itemType: ItemType = existing?.envelope.itemType ?? 'login';
      const encrypted = await encryptCredential(
        vaultKey,
        { vaultId: vault.id, itemId: id, itemType, revision },
        payload,
      );
      const envelope = existing
        ? await api<EncryptedVaultItem>(`/credentials/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              expectedRevision: existing.envelope.revision,
              ...encrypted,
            }),
          })
        : await api<EncryptedVaultItem>('/credentials', {
            method: 'POST',
            body: JSON.stringify({ id, itemType, ...encrypted }),
          });
      setItems((current) => [
        { envelope, payload },
        ...current.filter((item) => item.envelope.id !== id),
      ]);
      setNotice(
        existing ? 'Credential updated.' : 'Credential encrypted and saved.',
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to save credential',
      );
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function deleteCredential(item: DecryptedItem) {
    if (
      !window.confirm(`Delete “${item.payload.title}”? This cannot be undone.`)
    )
      return;
    setBusy(true);
    try {
      await api(`/credentials/${item.envelope.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((candidate) => candidate !== item));
      setNotice('Credential deleted.');
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to delete credential',
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      setVaultKey(null);
      setItems([]);
      setVault(null);
      setUser(null);
      setCsrfToken('');
      setScreen('auth');
      setNotice('Signed out.');
    }
  }

  if (screen === 'loading') return <LoadingScreen />;
  if (screen === 'auth') {
    return <AuthScreen busy={busy} notice={notice} onSubmit={authenticate} />;
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        locked={screen !== 'vault'}
        onLock={screen === 'vault' ? lock : undefined}
        onLogout={() => void logout()}
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {screen === 'setup' && <SetupScreen busy={busy} onSubmit={setupVault} />}
      {screen === 'locked' && <UnlockScreen busy={busy} onSubmit={unlock} />}
      {screen === 'vault' && (
        <VaultScreen
          busy={busy}
          items={items}
          onSave={saveCredential}
          onDelete={deleteCredential}
        />
      )}
    </div>
  );
}

function Header({
  user,
  locked,
  onLock,
  onLogout,
}: {
  user: PublicUser | null;
  locked: boolean;
  onLock?: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">K</span>
        <span>KeyNest</span>
        <span className="wip-chip">WIP</span>
      </div>
      <div className="topbar-actions">
        <span className={`status-pill ${locked ? '' : 'secure'}`}>
          <span className="status-dot" />
          {locked ? 'Locked' : 'End-to-end encrypted'}
        </span>
        <span className="user-name">{user?.name}</span>
        {onLock && (
          <button className="button ghost" onClick={onLock}>
            Lock
          </button>
        )}
        <button className="button ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <main className="centered-screen">
      <div className="brand large">
        <span className="brand-mark">K</span>
        <span>KeyNest</span>
      </div>
      <div className="loader" aria-label="Loading" />
    </main>
  );
}

function AuthScreen({
  busy,
  notice,
  onSubmit,
}: {
  busy: boolean;
  notice: string;
  onSubmit: (
    mode: 'login' | 'register',
    values: Record<string, string>,
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit(
      mode,
      Object.fromEntries(data.entries()) as Record<string, string>,
    );
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand large">
          <span className="brand-mark">K</span>
          <span>KeyNest</span>
          <span className="wip-chip">WIP</span>
        </div>
        <div className="preview-warning" role="note">
          <strong>Work in progress</strong>
          <span>
            Educational preview only. Use synthetic credentials—do not store
            real passwords.
          </span>
        </div>
        <p className="eyebrow">YOUR SECRETS. YOUR KEYS.</p>
        <h1>A quieter, safer place for what matters.</h1>
        <p className="lede">
          Credentials are encrypted in your browser. The API stores
          ciphertext—not your vault password, keys, or readable records.
        </p>
        <div className="trust-row">
          <span>◆ Browser encryption</span>
          <span>◆ Authenticated envelopes</span>
          <span>◆ No plaintext sync</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="segmented">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </div>
        <h2>
          {mode === 'login' ? 'Welcome back' : 'Start your private vault'}
        </h2>
        <p>
          {mode === 'login'
            ? 'Use your account password. Your vault password comes next.'
            : 'Your account password and vault password remain separate.'}
        </p>
        {notice && (
          <div className="notice inline" role="status">
            {notice}
          </div>
        )}
        <form onSubmit={submit} className="form-stack">
          {mode === 'register' && (
            <Field label="Name" name="name" autoComplete="name" minLength={1} />
          )}
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Account password"
            name="password"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            minLength={12}
          />
          <button className="button primary full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Continue'
                : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}

function SetupScreen({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('masterPassword'));
    if (password.length < 14 || password !== data.get('confirmation')) {
      setError(
        password.length < 14
          ? 'Use at least 14 characters.'
          : 'The passwords do not match.',
      );
      return;
    }
    void onSubmit(password);
  }
  return (
    <main className="focus-layout">
      <section className="focus-card">
        <span className="lock-orb">◇</span>
        <p className="eyebrow">ONE LAST KEY</p>
        <h1>Create your vault password</h1>
        <p>
          This password derives the key that unlocks your vault. It never goes
          to the API and cannot be recovered.
        </p>
        {error && <div className="field-error">{error}</div>}
        <form className="form-stack" onSubmit={submit}>
          <Field
            label="Vault master password"
            name="masterPassword"
            type="password"
            autoComplete="new-password"
            minLength={14}
          />
          <Field
            label="Confirm vault password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={14}
          />
          <button className="button primary full" disabled={busy}>
            {busy ? 'Creating encrypted vault…' : 'Create encrypted vault'}
          </button>
        </form>
        <p className="fine-print">
          Store this password safely. KeyNest deliberately has no server-side
          recovery path for it.
        </p>
      </section>
    </main>
  );
}

function UnlockScreen({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (password: string) => Promise<void>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(
      String(new FormData(event.currentTarget).get('masterPassword')),
    );
  }
  return (
    <main className="focus-layout">
      <section className="focus-card compact">
        <span className="lock-orb">◇</span>
        <p className="eyebrow">VAULT LOCKED</p>
        <h1>Unlock locally</h1>
        <p>
          Your browser will derive the wrapping key and authenticate the
          encrypted vault key.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <Field
            label="Vault master password"
            name="masterPassword"
            type="password"
            autoFocus
            autoComplete="current-password"
          />
          <button className="button primary full" disabled={busy}>
            {busy ? 'Unlocking…' : 'Unlock vault'}
          </button>
        </form>
      </section>
    </main>
  );
}

function VaultScreen({
  busy,
  items,
  onSave,
  onDelete,
}: {
  busy: boolean;
  items: DecryptedItem[];
  onSave: (
    payload: CredentialPayload,
    existing?: DecryptedItem,
  ) => Promise<void>;
  onDelete: (item: DecryptedItem) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DecryptedItem | 'new' | null>(null);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? items.filter(({ payload }) =>
          [payload.title, payload.username, payload.url].some((value) =>
            value.toLowerCase().includes(normalized),
          ),
        )
      : items;
  }, [items, query]);
  return (
    <main className="vault-layout">
      <aside className="sidebar">
        <p className="sidebar-label">VAULT</p>
        <button className="nav-item active">
          <span>All items</span>
          <b>{items.length}</b>
        </button>
        <button className="nav-item" disabled>
          <span>Favourites</span>
          <b>0</b>
        </button>
        <div className="security-card">
          <span>◆</span>
          <div>
            <strong>Zero-knowledge boundary</strong>
            <p>Search and decryption stay in this tab.</p>
          </div>
        </div>
      </aside>
      <section className="vault-main">
        <div className="vault-heading">
          <div>
            <p className="eyebrow">PERSONAL VAULT</p>
            <h1>Your credentials</h1>
            <p>
              {items.length} item{items.length === 1 ? '' : 's'}, decrypted in
              memory only
            </p>
          </div>
          <button className="button primary" onClick={() => setEditing('new')}>
            ＋ Add item
          </button>
        </div>
        <div className="search">
          <span>⌕</span>
          <input
            aria-label="Search decrypted items"
            placeholder="Search locally by title, username, or website"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h2>{items.length ? 'No local matches' : 'Your vault is ready'}</h2>
            <p>
              {items.length
                ? 'Try a different search.'
                : 'Add your first login. It will be encrypted before the request leaves this tab.'}
            </p>
            {!items.length && (
              <button
                className="button primary"
                onClick={() => setEditing('new')}
              >
                Add first credential
              </button>
            )}
          </div>
        ) : (
          <div className="credential-grid">
            {visible.map((item) => (
              <CredentialCard
                key={item.envelope.id}
                item={item}
                onEdit={() => setEditing(item)}
                onDelete={() => void onDelete(item)}
              />
            ))}
          </div>
        )}
      </section>
      {editing && (
        <CredentialDialog
          existing={editing === 'new' ? undefined : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await onSave(payload, editing === 'new' ? undefined : editing);
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function CredentialCard({
  item,
  onEdit,
  onDelete,
}: {
  item: DecryptedItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const domain = item.payload.url
    ? item.payload.url.replace(/^https?:\/\//, '').split('/')[0]
    : 'Secure login';
  return (
    <article className="credential-card">
      <div className="credential-icon">
        {item.payload.title.slice(0, 1).toUpperCase() || '•'}
      </div>
      <div className="credential-content">
        <h2>{item.payload.title || 'Untitled'}</h2>
        <p>{domain}</p>
        <span>{item.payload.username || 'No username'}</span>
        <code>{visible ? item.payload.password : '••••••••••••'}</code>
      </div>
      <div className="card-actions">
        <button
          title={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? '◉' : '◎'}
        </button>
        <button
          title="Copy password"
          onClick={() =>
            void navigator.clipboard.writeText(item.payload.password)
          }
        >
          ⧉
        </button>
        <button title="Edit" onClick={onEdit}>
          ✎
        </button>
        <button title="Delete" onClick={onDelete}>
          ×
        </button>
      </div>
    </article>
  );
}

function CredentialDialog({
  existing,
  busy,
  onClose,
  onSave,
}: {
  existing?: DecryptedItem;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: CredentialPayload) => Promise<void>;
}) {
  const [password, setPassword] = useState(existing?.payload.password ?? '');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    ) as Record<string, string>;
    void onSave({
      title: values.title,
      username: values.username,
      password,
      url: values.url,
      notes: values.notes,
    }).catch(() => undefined);
  }
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">ENCRYPTED LOGIN</p>
            <h2 id="dialog-title">
              {existing ? 'Edit credential' : 'Add credential'}
            </h2>
          </div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field
            label="Title"
            name="title"
            defaultValue={existing?.payload.title}
            autoFocus
          />
          <div className="two-columns">
            <Field
              label="Username or email"
              name="username"
              defaultValue={existing?.payload.username}
            />
            <Field
              label="Website"
              name="url"
              type="url"
              defaultValue={existing?.payload.url}
            />
          </div>
          <label className="field">
            <span>Password</span>
            <div className="password-row">
              <input
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
              >
                Generate
              </button>
            </div>
          </label>
          <label className="field">
            <span>Private notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={existing?.payload.notes}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="button ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? 'Encrypting…' : 'Encrypt & save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  ...input
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} required {...input} />
    </label>
  );
}
