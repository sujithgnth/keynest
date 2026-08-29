# ADR 004: Use MongoDB for the First Persistence Model

## Status

Accepted on August 29, 2026. Supersedes the PostgreSQL source-of-truth portion
of ADR 002; its RabbitMQ and observability decisions remain accepted.

## Context

KeyNest was originally planned as a MongoDB-first learning project, followed by
a separate PostgreSQL comparison. A later implementation jumped directly to
PostgreSQL before the domain entities and encrypted-metadata policy were made
explicit. That implementation proved the vertical slice, but it bypassed the
intended document-model exercise.

The current domain has one user-owned vault, independently updated credential
items, durable sessions, append-only audit records, and an outbox. Credential
contents are opaque ciphertext to the server.

## Decision

1. MongoDB is the durable source of truth for the first model.
2. Use the official MongoDB Node.js driver and typed collection documents. Keep
   domain entities independent from MongoDB `_id` mapping and NestJS.
3. Use separate `users`, `vaults`, `credential_items`, `sessions`,
   `audit_logs`, and `outbox_events` collections. Do not embed unbounded items,
   sessions, or audit history in a user or vault document.
4. Store UUID strings as `_id` values. This preserves the existing API IDs and
   the IDs bound into encryption AAD.
5. Keep references as explicit UUID fields and enforce ownership in repository
   queries. MongoDB does not provide foreign-key or cascade guarantees, so
   deletion workflows and orphan checks remain application responsibilities.
6. Create only indexes that support current uniqueness, ownership, active
   session, sync ordering, audit, TTL, and outbox query patterns.
7. Run MongoDB as a single-node replica set locally and in CI. Audit and outbox
   inserts use one majority-write transaction.
8. Keep Redis as a session/rate-limit accelerator and RabbitMQ as asynchronous
   transport; neither is the durable vault store.

## Consequences

- Encrypted envelopes map naturally to documents without pretending the server
  can query their contents.
- Credential items remain independently writable and paginatable; a vault
  document cannot grow without bound.
- Unique and TTL indexes cover important invariants, but referential integrity
  is weaker than in PostgreSQL.
- Transactions require a replica set, increasing local setup complexity.
- The outbox publisher uses a short claim lease and never holds a database
  transaction open across RabbitMQ I/O. Delivery remains at least once.
- Schema evolution is owned by typed models, setup code, DTO validation, tests,
  and explicit migration scripts when stored shapes change. TypeScript types
  alone do not validate existing database documents.

## Alternatives considered

- **Keep PostgreSQL as the first model:** technically sound, but it skips the
  explicitly intended MongoDB modeling exercise. It remains the comparison
  target in `docs/postgresql-comparison.md`.
- **Use Mongoose:** useful for ODM validation and middleware, but rejected for
  this small slice so collection boundaries, filters, indexes, and transaction
  behavior remain visible.
- **Embed all credentials in `vaults`:** rejected because a growing vault would
  create a hot, unbounded document and make independent revisions and sync
  pagination awkward.
- **Store sessions only in Redis:** rejected because eviction or restart would
  become an authentication source-of-truth event.

## Review trigger

Revisit this decision when sharing, organization membership, policy joins,
cross-resource reporting, or measured consistency problems make relational
constraints materially more valuable.
