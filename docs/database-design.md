# Database Design Notes

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

## Review Checklist

When reviewing the Prisma schema, check:

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