# Database Design Notes

Last updated: June 29, 2026

## Current Goal

Design the database for KeyNest, a password manager with client-side encrypted vault data.

The database should support:

- User accounts
- Vault metadata
- Encrypted credential storage
- Sessions and refresh token rotation
- Audit logging
- Optional folders/tags later

## Core Security Principle

The database must never store plaintext credential data.

Sensitive fields such as username, password, notes, and possibly title should be encrypted in the browser before being sent to the backend.

## Current Field Policy

### User

- `name`: plaintext
- `email`: plaintext
- `emailNormalized`: plaintext, unique index
- `passwordHash`: hashed
- `createdAt`, `updatedAt`: plaintext

Do not store raw passwords, master passwords, reset tokens in plaintext, or vault encryption keys.

### Vault

- `userId`: plaintext
- `name`: plaintext for MVP, possibly encrypted later
- `kdfAlgorithm`, `kdfParams`, `encryptionVersion`: plaintext
- `createdAt`, `updatedAt`: plaintext

Encryption settings are not secret. They help the client know how to derive or use keys. The backend must not store key material that can decrypt vault data.

### CredentialItem

- `userId`: plaintext
- `vaultId`: plaintext
- `title`: plaintext for MVP search, but this leaks account existence
- `domain`: plaintext if domain filtering is needed
- `url`: prefer encrypted full URL; avoid plaintext query strings
- `username`: encrypted by default
- `category`: plaintext only if category filtering is part of MVP
- `encryptedPayload`: encrypted
- `encryptionVersion`: plaintext
- `createdAt`, `updatedAt`, optional `deletedAt`: plaintext

The encrypted payload should contain passwords, notes, recovery codes, secret questions, usernames unless deliberately exposed, and full URLs if full URLs are sensitive.

### Session

- `userId`: plaintext
- `refreshTokenHash`: hashed
- `expiresAt`, `revokedAt`, `createdAt`, optional `lastUsedAt`: plaintext
- `ipHash`: optional hashed
- `userAgent`: optional plaintext, with privacy caution

`userId` should remain plaintext because the backend must query and revoke sessions by user. Refresh tokens should be hashed, not encrypted, because the server only needs to verify a presented token.

### AuditLog

- `userId`: plaintext
- `action`: plaintext
- `resourceType`: plaintext
- `resourceId`: plaintext
- `metadata`: plaintext but strictly allowlisted per action
- `createdAt`: plaintext

Audit logs must never include passwords, tokens, encryption keys, plaintext credential values, full request bodies, or encrypted payloads.

## Initial Index Plan

Users:

- unique `{ emailNormalized: 1 }`

Vaults:

- `{ userId: 1 }`

Credential items:

- `{ userId: 1, vaultId: 1, updatedAt: -1 }`
- `{ userId: 1, title: 1 }` only if server-side title search is kept
- `{ userId: 1, category: 1, updatedAt: -1 }` only if category filtering is kept

Sessions:

- `{ userId: 1, revokedAt: 1 }`
- unique `{ refreshTokenHash: 1 }`
- TTL `{ expiresAt: 1 }`

Audit logs:

- `{ userId: 1, createdAt: -1 }`
- optional `{ action: 1, createdAt: -1 }`
- optional TTL `{ createdAt: 1 }`

Avoid speculative indexes until the MVP query patterns are clear.

## Review Checklist

When reviewing the MongoDB/Mongoose schema, check:

- Are sensitive fields stored only as encrypted blobs?
- Are sessions modeled properly?
- Are refresh tokens stored as hashes, not plaintext?
- Are audit logs free from sensitive data?
- Are user-owned resources scoped by `userId`?
- Are useful indexes added?
- Is soft delete needed for credentials?
- Is the schema simple enough for MVP?
- Is anything overengineered?

## Open Questions

- Should credential titles be encrypted or searchable metadata?
- Should folders/tags be MVP or Version 2?
- Should deleted credentials be soft deleted?
- Should audit log metadata be JSON?
- Should session IP and user agent be stored?

## Current Learning Note

Detailed Q&A and challenged assumptions are stored in `docs/learning-notes/database-model-q-and-a.md`.
