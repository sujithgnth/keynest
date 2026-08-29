# ADR 006: Organize the API Around Domain Boundaries

Status: Accepted

Date: August 30, 2026

## Context

The first API implementation had separate NestJS folders for users, auth,
sessions, vaults, credentials, and audit logs, but the actual entity model and
MongoDB document mappings were centralized. Services also accepted
presentation DTO classes directly. That layout grouped files by endpoint while
leaving domain ownership and dependency direction ambiguous.

KeyNest is still small enough for a modular monolith. Separate deployable
services would add network, consistency, tracing, and operational costs without
an independent scaling or ownership need.

## Decision

1. Use three bounded contexts: `identity`, `vault`, and `audit`.
2. Give each context `domain`, `application`, `infrastructure`, and
   `presentation` layers, a NestJS module, and a `public-api.ts`.
3. Keep entities and domain policies free of NestJS, MongoDB, Redis, RabbitMQ,
   and HTTP validation dependencies.
4. Let application services consume plain input contracts. Controllers own
   `class-validator` DTOs and may pass them structurally to application methods.
5. Keep MongoDB document types, collection names, and indexes with the context
   that owns the documents. The platform schema runner only coordinates domain
   installers.
6. Require cross-domain imports to target `public-api.ts`. Platform composition
   and operational tooling may call domain infrastructure adapters explicitly.
7. Keep database connections, RabbitMQ transport, health, configuration, HTTP
   request context, and observability under `platform`.
8. Enforce the structure and dependency direction with an architecture test.

## Consequences

- Entity, persistence, and use-case ownership are visible from the filesystem.
- Identity can expose session guards without making its Redis and MongoDB
  details part of another context's implementation.
- Vault depends on the audit public API rather than its persistence internals.
- Audit owns the outbox publisher because the current outbox contains audit
  events; the RabbitMQ transport remains platform infrastructure.
- Adding a domain requires some repeated composition and collection/index setup
  code. This is intentional until repetition proves a stable abstraction.
- These boundaries do not make the modules independently deployable. A future
  service split would need explicit API/event contracts and new consistency
  decisions.

## Alternatives considered

- **Keep endpoint folders and only split `entities.ts`:** rejected because it
  would fix file size without defining ownership or dependency direction.
- **Global technical layers (`controllers`, `services`, `repositories`):**
  rejected because changes to one capability would remain scattered.
- **One module per entity:** rejected because auth/users/sessions and
  vault/credentials form cohesive workflows and would create noisy module
  wiring.
- **Microservices now:** rejected because the deployment and distributed-data
  costs are not justified by the MVP's scale or team structure.
