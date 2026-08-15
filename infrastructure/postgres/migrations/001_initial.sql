CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  email_normalized varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vaults (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  kdf_algorithm varchar(30) NOT NULL CHECK (kdf_algorithm = 'PBKDF2-SHA256'),
  kdf_iterations integer NOT NULL CHECK (kdf_iterations >= 310000),
  kdf_salt text NOT NULL,
  wrap_algorithm varchar(30) NOT NULL CHECK (wrap_algorithm = 'AES-256-GCM'),
  wrap_nonce text NOT NULL,
  wrapped_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY,
  vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  item_type varchar(30) NOT NULL
    CHECK (item_type IN ('login', 'note', 'card', 'api-key')),
  envelope_version integer NOT NULL CHECK (envelope_version = 1),
  nonce text NOT NULL,
  ciphertext text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS vault_items_sync_idx
  ON vault_items (vault_id, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  csrf_token_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS sessions_active_user_idx
  ON sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  target_type varchar(60) NOT NULL,
  target_id uuid,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('success', 'failure')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_time_idx
  ON audit_events (actor_user_id, occurred_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  event_type varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS outbox_events_unpublished_idx
  ON outbox_events (available_at, created_at)
  WHERE published_at IS NULL;
