# ADR 002: PostgreSQL, RabbitMQ Outbox, and Local Observability

## Status

Accepted on August 15, 2026

## Context

KeyNest needs durable relational ownership and revision constraints, reliable
security-event publication, and observable local failure behavior. The prior
MongoDB user-only slice and Redis-only session creation did not provide the
required system boundary.

## Decision

1. Use PostgreSQL as the source of truth for users, vaults, encrypted items,
   sessions, audit events, and outbox events.
2. Use parameterized `pg` queries behind NestJS services for this MVP. The
   domain is small enough that an ORM would add a second abstraction before the
   query and transaction boundaries are understood.
3. Persist an audit event and `audit.created` outbox event in one database
   transaction.
4. Publish outbox messages to a durable RabbitMQ topic exchange with publisher
   confirms. Consume with a durable queue, bounded prefetch, manual
   acknowledgements, and a dead-letter queue.
5. Emit structured redacted JSON logs and Prometheus metrics. Use Promtail,
   Loki, Prometheus, and Grafana for the reproducible local observability stack.
6. Keep Redis outside the source-of-truth boundary: it accelerates sessions and
   enforces local auth rate limits, while durable session validity remains in
   PostgreSQL.

## Consequences

- PostgreSQL constraints and optimistic revisions make ownership and concurrent
  updates explicit.
- The outbox avoids the database-commit/message-publish dual-write gap.
- Delivery is at least once, so consumers need idempotency by event ID.
- Direct SQL keeps behavior visible but requires disciplined mapping,
  transaction handling, and migration ownership.
- Local dashboards make failure diagnosis demonstrable, but they are not a
  production SLO, paging system, or long-term retention design.
- RabbitMQ is justified for durable asynchronous security-event processing. It
  is not placed in the synchronous vault CRUD path.

## Alternatives considered

- **Publish directly after CRUD:** rejected because a process crash can lose an
  event after the database mutation commits.
- **Use Redis as the event queue:** rejected because Redis already has a cache
  role and the project needs explicit acknowledgement/DLQ semantics.
- **Add an ORM immediately:** deferred. It may become useful as the relational
  surface grows, but changing persistence style without a measured maintenance
  problem would not improve the current MVP.
- **Log only to container stdout:** insufficient for a demonstrable queryable
  log path; stdout is retained while JSON files also feed Loki locally.

## KDF note

The browser uses native Web Crypto PBKDF2-SHA256 at 600,000 iterations to avoid
shipping a security-sensitive WASM dependency in the MVP. PBKDF2 is not
memory-hard. A future Argon2id adoption requires a benchmarked browser
implementation and a new versioned wrapping envelope; existing vaults cannot be
silently reinterpreted.
