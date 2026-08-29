# MongoDB Data Design

Last updated: August 30, 2026

Each bounded context owns its executable collection names, TypeScript document
models, and indexes under
`apps/api/src/app/domains/<context>/infrastructure/mongo`. The platform-level
`mongo-schema.ts` coordinates the three idempotent schema installers through
`npm run db:setup`.

MongoDB is the first durable source of truth. Redis accelerates session reads
and rate limits; RabbitMQ transports confirmed outbox events. See ADR 004 for
the database decision, ADR 005 for the metadata boundary, and
`postgresql-comparison.md` for the later SQL learning exercise.

## Domain entities before persistence

The framework-neutral entities are split by owner under each bounded context's
`domain` directory: identity owns `User` and `Session`, vault owns `Vault` and
`CredentialItem`, and audit owns `AuditLog` and `OutboxEvent`. They use public
`id` fields and `Date` values; each context's Mongo adapter maps `id` to the
document `_id`.

| Entity           | Responsibility                                  | Important invariants                                                |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `User`           | Account identity and authentication hash        | normalized email unique; raw password never stored                  |
| `Vault`          | One wrapped data-encryption key per user        | owner unique; key/KDF formats versioned; revision positive          |
| `CredentialItem` | Independently versioned encrypted item envelope | UUID bound into AAD; belongs to one vault; soft-deleted once        |
| `Session`        | Durable opaque-cookie validation and revocation | only token hashes stored; expiry checked in queries and TTL cleanup |
| `AuditLog`       | Append-only security event                      | fixed action/target/outcome shape; allow-listed metadata only       |

`OutboxEvent` is an infrastructure entity paired atomically with each audit log.

## Field treatment policy

Labels:

- **PLAINTEXT:** queryable operational metadata;
- **ENCRYPTED:** AES-256-GCM envelope produced in the browser;
- **HASHED:** one-way verifier used by the server;
- **NOT STORED:** forbidden from durable or cache storage.

| Entity         | Field group                                                                           | Treatment               | Reason                                                     |
| -------------- | ------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| User           | `id`, `name`, `email`, `emailNormalized`, status, timestamps                          | PLAINTEXT               | account lookup and operation                               |
| User           | `passwordHash`                                                                        | HASHED with Argon2id    | authentication without password recovery                   |
| Vault          | owner ID, versions, KDF parameters/salt, revision, timestamps                         | PLAINTEXT               | ownership, compatibility, concurrency                      |
| Vault          | wrapped key, wrap nonce                                                               | ENCRYPTED ENVELOPE DATA | server stores but cannot unwrap without master-derived key |
| CredentialItem | IDs, item type, envelope version, nonce, revision, timestamps, deletion state         | PLAINTEXT               | ownership, sync, validation, optimistic concurrency        |
| CredentialItem | title, username, password, full URL, notes, categories/tags, favourite, custom fields | ENCRYPTED               | these fields reveal a user's account inventory and secrets |
| Session        | user ID, expiry/revocation/use timestamps                                             | PLAINTEXT               | validation, listing, revocation, cleanup                   |
| Session        | session and CSRF values                                                               | HASHED with SHA-256     | high-entropy bearer values need comparison, not recovery   |
| AuditLog       | actor/action/target/outcome/time and approved scalar metadata                         | PLAINTEXT               | investigation and delivery                                 |
| All            | master password, derived/unwrapped keys, raw session/CSRF tokens                      | NOT STORED              | crossing this boundary breaks the security model           |

`ciphertext`, `wrappedKey`, and nonces are not secrets in the same sense as
plaintext, but they are sensitive cryptographic material and must not be logged
or copied into audit metadata.

## Query and UX trade-offs

| Capability         | Supported server-side                                    | Consequence of the privacy boundary                                                                                    |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Search             | IDs and operational metadata only                        | title, username, URL, and notes search after browser decryption                                                        |
| Category filtering | coarse `itemType` only                                   | user categories/tags require local filtering                                                                           |
| Sorting            | `updatedAt` plus `_id` sync order                        | display sort by title/domain/category/favourite is local                                                               |
| Pagination         | stable ciphertext cursor direction on `(updatedAt, _id)` | complete encrypted-field results may require decrypting multiple pages; current API returns at most 1,000 active items |
| Audit              | actor/action/target/outcome/time                         | useful but leaks activity timing and resource identifiers; secrets and arbitrary request metadata are forbidden        |

Deterministic encryption, blind indexes, and searchable encryption are deferred:
they introduce equality/frequency leakage and key-rotation complexity that the
current scale does not justify.

## Collection boundaries

### `users`

One small account document. Unique index:

```text
{ emailNormalized: 1 } unique
```

### `vaults`

One document per user containing the KDF and wrapped-key envelope. Credentials
are references, not embedded, so the vault cannot become an unbounded hot
document. Unique index:

```text
{ ownerUserId: 1 } unique
```

### `credential_items`

One opaque credential envelope per document. `vaultId` is the only ownership
reference; the API first resolves the authenticated user's vault and scopes
every item operation to that ID.

```text
{ vaultId: 1, updatedAt: -1, _id: -1 }
```

The active-item predicate is evaluated after the indexed vault/sort scan.
MongoDB does not support an `$exists: false` predicate in a partial index, and
using a different partial predicate would not match the stored/query shape.

The design intentionally avoids duplicating `userId` on each item. Duplicating
it would simplify one filter but create a second ownership fact that can drift.

### `sessions`

Sessions are independent documents because they grow, expire, and revoke
independently from the user. Indexes:

```text
{ tokenHash: 1 } unique
{ userId: 1, revokedAt: 1, expiresAt: -1 }
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
```

TTL deletion is asynchronous, so authentication queries always check
`expiresAt` and revocation explicitly.

### `audit_logs`

Append-only documents, separate from the user to avoid unbounded growth and to
support time-ordered access.

```text
{ actorUserId: 1, occurredAt: -1, _id: -1 }
{ action: 1, occurredAt: -1 }
```

Audit metadata is a typed scalar map, not a request-body dump. The service also
rejects sensitive property names before persistence.

### `outbox_events`

Infrastructure collection written in the same transaction as `audit_logs`.
The publisher atomically claims one pending event with a 30-second lease,
publishes through a RabbitMQ confirm channel, then marks it published. A crash
after broker confirmation can still duplicate delivery, so consumers use the
stable event `_id` for idempotency.

## Naming and reference rules

- collection names use plural `snake_case`;
- document fields use `camelCase` to avoid repetitive application mapping;
- `_id` values are UUID strings because they are public IDs and part of AAD;
- references are named `<entity>Id` and remain plaintext;
- no MongoDB `ObjectId` is exposed in API contracts;
- no automatic population hides ownership queries.

## Security and consistency review

- MongoDB has no foreign keys. Account-deletion code must delete dependent
  sessions, items, vault, and audit/outbox data deliberately and be retryable.
- A single-node replica set is acceptable only for local development and CI; it
  provides transaction semantics, not production availability.
- Unique indexes provide duplicate-email, one-vault-per-user, and token-hash
  invariants. DTOs validate formats and sizes before writes.
- Optimistic updates include the expected revision. A mismatch returns conflict
  rather than overwriting a newer ciphertext envelope.
- Soft deletion keeps a sync tombstone direction, but permanent retention and
  purge policy are not yet implemented.
- Backups contain identity data, authentication/session hashes, audit metadata,
  and encrypted vault material. They remain sensitive even without plaintext.
- Database compromise still exposes item counts, item types, timestamps,
  ciphertext sizes, and access patterns.
