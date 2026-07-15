# Database Model Q&A

Last updated: June 29, 2026

Purpose: Capture the current learning discussion for the KeyNest MongoDB model before implementation.

## Design Goal

Design the first MongoDB model for a password manager where the backend can authenticate users and enforce ownership, but must not read credential secrets.

The main design question:

```txt
Which fields must remain queryable plaintext metadata, which fields should be encrypted by the browser, and which fields should be hashed?
```

## Field Treatment Rules

Use these labels consistently:

- `PLAINTEXT`: backend can read, validate, index, filter, or sort by the value.
- `ENCRYPTED`: backend stores ciphertext only and cannot query the original value.
- `HASHED`: backend can compare a presented value with a stored hash, but cannot recover the original value.
- `NOT STORED`: value should never be persisted.

## Current Recommended Model

### User

```txt
name: PLAINTEXT
email: PLAINTEXT
emailNormalized: PLAINTEXT
passwordHash: HASHED
createdAt: PLAINTEXT
updatedAt: PLAINTEXT
```

Notes:

- `emailNormalized` should have a unique index.
- `passwordHash` must never be returned by the API.
- Do not store the user's raw password or master password.

Indexes:

```txt
unique { emailNormalized: 1 }
```

### Vault

```txt
userId: PLAINTEXT
name: PLAINTEXT for MVP, but consider ENCRYPTED later if vault names become sensitive
kdfAlgorithm: PLAINTEXT
kdfParams: PLAINTEXT
encryptionVersion: PLAINTEXT
createdAt: PLAINTEXT
updatedAt: PLAINTEXT
```

Notes:

- `userId` must be plaintext so the backend can enforce ownership.
- Encryption settings are not secret; they tell the client how to derive or use keys.
- Do not store the master password, raw encryption key, or key material that lets the server decrypt vault data.

Indexes:

```txt
{ userId: 1 }
```

### CredentialItem

```txt
userId: PLAINTEXT
vaultId: PLAINTEXT
title: PLAINTEXT for MVP search, but this leaks the existence of accounts
username: ENCRYPTED by default
url: PLAINTEXT for MVP filtering, but consider domain-only metadata instead of full URL
category: PLAINTEXT if category filtering is required
encryptedPayload: ENCRYPTED
encryptionVersion: PLAINTEXT
createdAt: PLAINTEXT
updatedAt: PLAINTEXT
deletedAt: PLAINTEXT optional soft delete marker
```

Notes:

- `encryptedPayload` should contain sensitive values such as password, notes, full username if not stored separately, recovery codes, and secret questions.
- Plaintext `title`, `url`, and `category` improve UX, search, sorting, and filtering, but leak metadata.
- If privacy is prioritized over server-side search, move `title`, `url`, and `category` into `encryptedPayload` and accept client-side filtering after fetch.
- `userId` should remain on the credential item even though `vaultId` exists. It makes ownership filters and indexes simple and avoids depending on a join to prove user scope.

Indexes:

```txt
{ userId: 1, vaultId: 1, updatedAt: -1 }
{ userId: 1, title: 1 }
{ userId: 1, category: 1, updatedAt: -1 }
```

Use only the indexes needed by actual MVP queries. Avoid adding many speculative indexes because each index slows writes and increases storage.

### Session

```txt
userId: PLAINTEXT
refreshTokenHash: HASHED
expiresAt: PLAINTEXT
revokedAt: PLAINTEXT optional
createdAt: PLAINTEXT
lastUsedAt: PLAINTEXT optional
ipHash: HASHED optional
userAgent: PLAINTEXT optional, but be careful because it can become noisy PII
```

Important correction:

- `userId` should not be encrypted. The backend needs to find active sessions for a user, revoke sessions, and enforce account-level logout.
- `refreshTokenHash` should be hashed, not encrypted. The server only needs to verify a presented refresh token; it should not be able to recover the original token.

Indexes:

```txt
{ userId: 1, revokedAt: 1 }
unique { refreshTokenHash: 1 }
TTL { expiresAt: 1 }
```

Refresh token storage rule:

- Store a high-entropy refresh token in an HttpOnly, Secure, SameSite cookie.
- Store only a hash of that refresh token in MongoDB.
- On refresh, compare the presented token after hashing.
- For stronger security, rotate refresh tokens and revoke the previous session token on use.

### AuditLog

```txt
userId: PLAINTEXT
action: PLAINTEXT
resourceType: PLAINTEXT
resourceId: PLAINTEXT
metadata: PLAINTEXT but strictly allowlisted
createdAt: PLAINTEXT
```

Safe `action` examples:

```txt
USER_REGISTERED
USER_LOGIN_SUCCEEDED
USER_LOGIN_FAILED
VAULT_CREATED
CREDENTIAL_CREATED
CREDENTIAL_UPDATED
CREDENTIAL_DELETED
SESSION_REVOKED
```

Audit-log safety rules:

- Never store passwords, refresh tokens, access tokens, encryption keys, plaintext credential values, secret notes, or full encrypted payloads in audit logs.
- Do not store arbitrary request bodies in `metadata`.
- Use an allowlist per action, for example `{ credentialId, vaultId, reasonCode }`.
- Prefer resource IDs and event types over descriptive text that might accidentally include secrets.

Indexes:

```txt
{ userId: 1, createdAt: -1 }
{ action: 1, createdAt: -1 }
TTL optional { createdAt: 1 }
```

## Challenged Assumptions

### Assumption: Session `userId` should be encrypted

Correction: keep it plaintext. Session lookup and revocation are backend responsibilities. Encrypting `userId` would make normal session operations harder without meaningfully protecting secrets.

### Assumption: `refreshTokenHash` should be encrypted

Correction: hash it. A refresh token is like a password-equivalent bearer secret. The server should verify it, not decrypt it.

### Assumption: Credential `username` can be plaintext

Challenge: usernames often reveal personal identity or account details. Default to encrypted unless there is a strong UX requirement for server-side search by username.

### Assumption: Full `url` can be plaintext

Challenge: full URLs can contain sensitive paths or query strings. For MVP, storing a normalized domain as plaintext is safer than storing the full URL. Store the full URL inside `encryptedPayload` if needed.

### Assumption: Audit `metadata` can be flexible JSON

Challenge: flexible JSON easily becomes a dumping ground for secrets. Use strict per-action allowlists.

## MVP Recommendation

For the first implementation:

- Store `User`, `Session`, and minimal `Vault` collections first.
- Implement registration and login before credential storage.
- For `CredentialItem`, store `title`, normalized `domain`, and `category` as plaintext metadata only if search/filter is required in the MVP.
- Store username, password, notes, and full URL in `encryptedPayload`.
- Keep audit logs minimal and safe.

## Next Recommended Mentor Prompt

Use this prompt to continue:

```txt
Help me turn the KeyNest MongoDB design into the first implementation slice:
User registration with NestJS, MongoDB/Mongoose, DTO validation, Argon2
password hashing, duplicate-email handling, and tests. Keep the implementation
small and explain which files should change and why.
```
