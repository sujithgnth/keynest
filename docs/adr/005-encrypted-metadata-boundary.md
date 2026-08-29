# ADR 005: Encrypt User-Meaningful Credential Metadata

## Status

Accepted on August 29, 2026. Extends ADR 001 with a field-level metadata policy.

## Context

Client-side encryption is not a binary choice. Titles, usernames, domains,
categories, favourites, and notes are useful for server-side search and sorting,
but they can reveal which services a user has, their identity, interests,
financial providers, employers, or health-related accounts.

KeyNest needs a rule that is explainable, testable, and difficult to weaken by
accident.

## Decision

Encrypt all user-authored or user-meaningful credential fields in the browser,
including title, username, password, full URL, notes, custom fields, card data,
API keys, user categories/tags, and favourite state.

The server may store only the minimum metadata needed to operate the encrypted
store:

- user, vault, item, session, audit, and event identifiers;
- normalized account email and display name for account operation;
- Argon2id account-password hashes and SHA-256 session/CSRF token hashes;
- item type, envelope/KDF algorithm versions, revision, nonce, ciphertext,
  wrapped-key material, KDF salt and parameters;
- created, updated, expiry, revocation, deletion, claim, and publication times;
- strictly allow-listed audit action, target, outcome, and non-secret metadata.

The account password, vault master password, derived wrapping key, unwrapped
vault key, raw session/CSRF tokens, and decrypted vault fields are never stored.

## Query consequences

- **Search:** decrypt and search locally while the vault is unlocked. MongoDB
  cannot search title, username, URL, or notes.
- **Category filtering:** the coarse system `itemType` can be filtered on the
  server. User-defined categories and tags are filtered locally.
- **Sorting:** sync order uses plaintext `(updatedAt, id)`. Display ordering by
  title, username, domain, category, or favourite is local after decryption.
- **Pagination:** the server can cursor-page ciphertext deterministically by
  `(updatedAt, id)`. A complete filtered result may require downloading and
  decrypting more than one page; the current personal-vault MVP caps a sync at
  1,000 active items and does not yet expose a cursor API.
- **Audit logs:** action, time, actor, target ID, outcome, and approved numeric or
  enum-like metadata remain plaintext for security investigation. Secrets,
  ciphertext, request bodies, descriptive titles, domains, and arbitrary JSON
  are rejected.

## Consequences

- A database disclosure still reveals account identity, item count, item type,
  timestamps, ciphertext sizes, and access/audit patterns.
- Search, filter, and user-facing sorting require an unlocked client and more
  client memory/CPU.
- Server-side indexing cannot improve encrypted-field queries.
- Adding a plaintext derived field later is a security-boundary change. It
  requires an ADR update, leakage analysis, explicit user value, and tests.

## Alternatives considered

- **Plaintext title/domain/category:** rejected because the convenience is not
  worth exposing a high-quality account inventory in the first model.
- **Deterministic encryption or blind indexes:** deferred. They leak equality
  and frequency, complicate key rotation, and are unnecessary at current scale.
- **Searchable encryption:** rejected for the MVP because its operational and
  cryptographic complexity is disproportionate to a personal-vault learning
  project.
