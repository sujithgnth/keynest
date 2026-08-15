# PostgreSQL Data Design

Last updated: August 15, 2026

The executable schema is `infrastructure/postgres/migrations/001_initial.sql`.
PostgreSQL is the durable source of truth; Redis is a cache/rate-limit service,
and RabbitMQ receives events through the outbox.

## Tables

| Table               | Purpose and sensitive-data policy                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `users`             | Plain name/normalized email, Argon2id account-password hash, status, timestamps                                          |
| `vaults`            | One owner per vault; KDF metadata and AES-GCM-wrapped random vault key; never the master password or plaintext vault key |
| `vault_items`       | Owner-derived vault FK, item type, envelope version, nonce, ciphertext, optimistic revision, timestamps, soft deletion   |
| `sessions`          | User FK, SHA-256 session/CSRF token hashes, expiry/use/revocation timestamps; never raw tokens                           |
| `audit_events`      | Allow-listed action, target, outcome, and safe metadata; never request bodies or encrypted/plain credential fields       |
| `outbox_events`     | Safe audit-event payload, attempts, availability, and publish timestamp                                                  |
| `schema_migrations` | Applied migration filenames                                                                                              |

## Ownership and concurrency

Item list/mutation queries join `vault_items` to `vaults.owner_user_id`; the API
does not accept an owner ID from the request body. Item updates require an
expected revision and increment it atomically. A stale writer receives a 409
rather than silently overwriting newer ciphertext.

## Plaintext metadata boundary

The server can observe user identity, that a vault exists, item IDs/types,
envelope versions, revisions, ciphertext lengths, and timestamps. Credential
title, URL, username, password, and notes are all inside the encrypted JSON
payload. Search therefore runs only after local browser decryption.

## Indexes and bounds

- Unique normalized email and one vault per owner
- Active-session lookups by user/expiry
- Active vault-item sync order by vault/update/id
- Audit history by actor/time/id
- Unpublished outbox scans by availability/creation time
- API list endpoints cap items at 1,000 and audit events at 100

## Migration rules

Migrations are ordered, recorded, and executed in a transaction by
`tools/migrate.ts`. Future schema changes must be additive or include an
explicit data/envelope migration; changing KDF/encryption meaning in place is
not permitted.
