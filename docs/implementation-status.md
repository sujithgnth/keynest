# KeyNest Implementation Status

Last verified: August 30, 2026

## Delivered MVP

| Capability          | Evidence in the repository                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser vault       | `apps/web/app/vault-app.tsx` implements auth, setup, lock/unlock, local search, CRUD, generation, and idle lock                                       |
| Client cryptography | `libs/crypto` implements versioned PBKDF2/AES-GCM wrapping and credential envelopes with AAD                                                          |
| Durable API         | NestJS modules persist users, hashed sessions, vault metadata, encrypted items, audit events, and outbox records in MongoDB                           |
| Domain boundaries   | Identity, vault, and audit contexts own four explicit layers; an architecture test rejects framework-bound entities and private cross-context imports |
| Session security    | Opaque HttpOnly cookies, hashed tokens, Redis cache, durable revocation, CSRF rotation/checks, and auth rate limits                                   |
| Messaging           | transactional MongoDB outbox, lease-based RabbitMQ confirm publisher, durable queue/DLQ, and a manual-ack worker                                      |
| Observability       | request IDs, stable error envelopes, redacted JSON logs, Prometheus metrics, Loki ingestion, and a provisioned Grafana dashboard                      |
| Reproducibility     | idempotent MongoDB index setup, multi-service Docker Compose, production builds, and an encrypted E2E smoke test                                      |
| AI boundary         | Allow-listed aggregate/documentation payload constructors and leakage tests; no remote model adapter                                                  |
| WebMCP boundary     | Experimental progressive enhancement for aggregate vault status and in-memory locking; no credential or unlock tools                                  |

## Verification boundary

The automated E2E smoke test proves a synthetic credential can be encrypted,
persisted, returned, and decrypted; its plaintext sentinel is absent from the
server-side vault, audit, and outbox fields inspected by the test; and its
outbox records are published. It does not prove the absence of every possible
implementation vulnerability.

On August 30, 2026, the full verification gate passed with the real MongoDB
persistence test enabled: 10 test files and 30 tests passed, all lint targets and
production builds passed, and the production-dependency audit reported zero
vulnerabilities. The Docker E2E run reported a ready API, successful encrypted
round trip, zero plaintext sentinel matches, two audit events, and zero pending
outbox events. MongoDB exposed all six expected collections and named indexes;
RabbitMQ showed one active consumer with empty main and dead-letter queues.

The browser flow has been checked for register, login, vault creation, item
creation, lock, unlock, and clean browser console output. Unit tests cover
account-password handling, session behavior, the AI boundary, cryptographic
round trips/tamper rejection, rate limiting, and the reduced-state WebMCP tool
boundary. Browser-agent invocation still requires experimental WebMCP support
and is not part of the Docker E2E smoke test. On August 29, 2026, a local
browser-agent smoke check discovered and invoked the signed-out status tool;
the unlocked lock-tool lifecycle remains unit-tested rather than live-tested in
an authenticated browser session.

## Deferred roadmap

- TOTP/2FA, passkeys, email verification, and recovery
- Family/organization sharing and cryptographic key distribution
- Angular admin, enterprise RBAC, policies, and approval workflows
- Import/export, browser extension, attachments, and mobile clients
- Production hosting, alert receivers, restore drills, load tests, and a
  professional security assessment

These are not implied by the working MVP and should not be claimed as delivered
in an interview or résumé.
