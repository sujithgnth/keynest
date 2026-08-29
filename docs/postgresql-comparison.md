# MongoDB and PostgreSQL Architecture Comparison

Status: learning exercise only; PostgreSQL is not the selected runtime store.

## Current decision

KeyNest starts with MongoDB as recorded in ADR 004. The comparison below keeps
the earlier SQL implementation useful as architecture evidence without
pretending that two production persistence paths are maintained.

| Concern                  | MongoDB first model                           | PostgreSQL comparison                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------ |
| Encrypted item shape     | Natural opaque-envelope document              | Natural row with explicit typed columns                |
| Ownership                | Application-scoped reference queries          | Foreign keys and joins                                 |
| One vault per user       | Unique index on `ownerUserId`                 | Unique foreign key on `owner_user_id`                  |
| Revision safety          | Conditional `findOneAndUpdate`                | Conditional `UPDATE ... WHERE revision = ?`            |
| Audit + outbox           | Replica-set transaction                       | Database transaction                                   |
| Session expiry           | TTL index plus query-time expiry check        | Scheduled cleanup/partitioning plus query-time check   |
| Referential integrity    | Application cleanup and repair                | Foreign keys and cascades                              |
| Flexible evolution       | Easy additive document fields                 | Explicit migrations and stronger schema constraints    |
| Cross-resource reporting | Aggregation pipelines                         | Joins and mature relational reporting                  |
| Cursor pagination        | Compound index on `(vaultId, updatedAt, _id)` | Compound/partial index on `(vault_id, updated_at, id)` |

## What PostgreSQL would improve

- database-enforced references and cascades;
- stronger check constraints for versions, statuses, and outcomes;
- clearer multi-entity transactions as sharing, roles, and policies grow;
- mature ad-hoc reporting and query-plan analysis;
- partial indexes that express active-row predicates precisely.

## What it would cost

- a migration and dual-model testing effort with no immediate user capability;
- more joins and mapping for a small personal-vault domain;
- pressure to model opaque encrypted payloads relationally even though their
  contents remain unqueryable;
- operational responsibility for a second durable store if both paths were kept.

## Proposed later exercise

Do not add a second live adapter yet. When the domain gains sharing or
organization membership, model the same five core entities in PostgreSQL,
generate representative synthetic data, and compare:

1. invariant enforcement and orphan prevention;
2. vault sync and audit cursor query plans;
3. audit/outbox transaction behavior under failure;
4. schema migration ergonomics;
5. measured read/write latency and storage, without claiming general database
   superiority from a toy benchmark.

The switch should happen only if the relational benefits outweigh migration and
operational cost, not because SQL is automatically more “production ready.”
