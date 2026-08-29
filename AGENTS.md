# KeyNest Contributor Guide

## Project status

KeyNest is a work-in-progress educational password-vault platform. Treat every
security claim as something that needs evidence. Use synthetic credentials in
development and demonstrations; the project is not security-certified or ready
for storing real secrets.

## Architecture map

- `apps/web`: Next.js client and the browser plaintext/cryptographic boundary.
- `apps/api`: NestJS API for accounts, sessions, ciphertext storage, auditing,
  outbox publication, and operational signals.
- `apps/api/src/app/domains`: identity, vault, and audit bounded contexts. Each
  owns domain, application, infrastructure, presentation, module, and public
  API files.
- `apps/api/src/app/platform`: shared runtime adapters for MongoDB, RabbitMQ,
  health, HTTP request context, configuration, and observability.
- `apps/worker`: RabbitMQ consumer for asynchronous security events.
- `libs/crypto`: Browser-side vault key wrapping and credential encryption.
- `libs/types`, `libs/validation`, `libs/ui`: shared contracts and UI code.
- `tools`: MongoDB schema setup and end-to-end smoke workflows.
- `infrastructure` and `docker-compose.yml`: local MongoDB, Redis, RabbitMQ,
  Prometheus, Grafana, Loki, and Promtail stack.
- `docs`: architecture decisions, threat model, operating instructions, and
  implementation status.

## Non-negotiable boundaries

1. Keep the vault master password, derived wrapping key, unwrapped vault key,
   and decrypted credential fields inside the browser boundary. Never send or
   persist them in the API, database, Redis, RabbitMQ, logs, metrics, traces, or
   external service requests.
2. Keep account authentication separate from vault encryption. Account
   passwords use server-side Argon2id hashing; the vault master password wraps a
   random vault key in the browser.
3. Preserve the versioned AES-256-GCM envelopes, unique nonces, authentication
   tags, and AAD binding to vault ID, item ID, item type, and revision. Treat a
   KDF or envelope-format change as a migration, not a silent reinterpretation.
4. Preserve opaque HttpOnly session cookies, server-side token hashing,
   expiration and revocation, CSRF protection on state-changing routes, CORS
   allow-listing, and authentication rate limits.
5. Keep audit metadata allow-listed and secret-free. Persist audit and outbox
   records atomically. RabbitMQ delivery is at least once, so side-effecting
   consumers must be idempotent by stable event ID.
6. Treat redaction as defense in depth, not permission to log sensitive input.
   Log structured operational metadata only.
7. Preserve the provider-neutral AI privacy boundary: only approved aggregate
   health data or approved documentation excerpts may leave the application.

## Working agreement

1. Inspect the current implementation, documentation, tests, and Git diff before
   editing. Preserve unrelated user changes.
2. Define the affected trust boundary, failure mode, and smallest useful
   vertical slice before implementation.
3. Reuse working foundations. Do not rewrite a subsystem unless the current
   design blocks the requirement and the trade-off is documented.
4. Add or update tests with the behavior. Security-boundary changes need
   negative, tamper, cross-user, replay, or leakage coverage as applicable.
5. Update the relevant ADR, threat model, operations runbook, and implementation
   status when architecture, security, runtime, or operational behavior changes.
6. Report what was verified separately from what remains an assumption. A build
   or dashboard alone is not end-to-end proof.
7. Keep public names, commits, branches, and documentation focused on the
   product and engineering decision. Do not add assistant or tooling attribution
   unless it is part of a real product integration.
8. Keep domain entities framework-neutral, keep HTTP DTOs out of application
   services, and route cross-domain imports through `public-api.ts`.

## Verification

Run checks in proportion to the change and prefer the repository scripts:

- Formatting: `npm run format:check`
- Static analysis: `npm run lint`
- API and crypto tests: `npm run test:api`
- Production builds: `npm run build`
- Standard full gate: `npm run verify`
- Runtime integration, when the local stack is available:
  `npm run infra:up`, `npm run db:setup`, then `npm run test:e2e`

For distributed changes, also inspect the database transaction, outbox record,
RabbitMQ payload/acknowledgement behavior, worker logs, metrics, and failure
path. Never claim these paths work unless they were exercised.

## Pull-request standard

Keep the pull request marked work in progress until the documented acceptance
criteria and relevant verification gates pass. Describe scope, architectural
trade-offs, security impact, evidence, and known limitations without inflating
the implementation status.
