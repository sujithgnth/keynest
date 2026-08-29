# KeyNest Interview Guide

Use this guide to understand the implementation, not to memorize impressive
phrases. Every claim below maps to code, tests, or an explicit limitation.

## Thirty-second project summary

> KeyNest is an educational password-vault MVP in an Nx TypeScript monorepo. I
> separated account authentication from vault encryption: NestJS verifies the
> account password with Argon2id, while a different vault password derives a
> wrapping key in the browser. The browser encrypts credential records with
> AES-256-GCM, and the API stores only versioned ciphertext envelopes. I used
> MongoDB as the durable source of truth, Redis for session acceleration and
> rate limits, and a transactional outbox with RabbitMQ for reliable security
> events. I added tests, an encrypted end-to-end smoke flow, and local
> Prometheus/Grafana/Loki observability. It is a work-in-progress learning
> project, not a security-certified production password manager.

## How the project was built

1. **Set the boundary before the features.** The central rule was that vault
   plaintext, the vault password, and unwrapped keys must never reach the API,
   database, Redis, RabbitMQ, logs, metrics, or an external AI service.
2. **Separated two kinds of passwords.** The account password authenticates a
   user and is Argon2id-hashed by the API. The vault password never leaves the
   browser; PBKDF2-SHA256 derives a wrapping key for a random vault key.
3. **Designed versioned authenticated envelopes.** AES-256-GCM protects each
   item. AAD binds the vault ID, item ID, item type, and revision so ciphertext
   cannot be moved to another record without authentication failing.
4. **Made ownership a server concern.** The API derives the user from the
   opaque HttpOnly session cookie and checks every vault/item query through the
   authenticated owner. It does not trust a client-supplied user ID.
5. **Chose durable and supporting stores deliberately.** MongoDB owns users,
   sessions, vault envelopes, encrypted items, audit events, and outbox events.
   Redis is replaceable support infrastructure for session caching and auth
   rate limiting.
6. **Avoided the message dual-write problem.** Audit and outbox records commit
   in one MongoDB transaction. A publisher later sends confirmed persistent
   messages to RabbitMQ. The worker uses bounded prefetch and manual ack, so the
   honest guarantee is at-least-once delivery.
7. **Added operational evidence.** Request IDs, stable errors, structured
   redacted logs, Prometheus metrics, Loki, and Grafana make local failure paths
   inspectable. They do not imply production SLOs or alerting.
8. **Verified the critical path.** Unit tests cover crypto tampering, auth,
   sessions, rate limiting, and AI leakage. The E2E smoke test encrypts a
   synthetic sentinel, persists and decrypts it, checks selected server-side
   storage for leakage, and waits for outbox publication.
9. **Added agents without weakening the vault boundary.** The experimental
   WebMCP slice exposes only aggregate status and a lock action. It cannot see
   decrypted items, keys, user objects, tokens, or API clients.

## Follow one credential through the system

```text
User enters a credential
  -> React keeps plaintext in browser memory
  -> Web Crypto encrypts JSON with the non-extractable vault key
  -> AAD binds vault ID + item ID + type + revision
  -> NestJS authenticates the session and CSRF token
  -> API authorizes ownership
  -> MongoDB stores nonce + ciphertext + envelope metadata
  -> audit document + outbox document commit atomically
  -> publisher confirms delivery to RabbitMQ
  -> worker validates and acknowledges the secret-free event
```

On read, the API returns an encrypted envelope and the browser authenticates and
decrypts it locally. Local search is intentionally possible only after unlock.

## Decisions an interviewer may challenge

### Why PBKDF2 instead of Argon2id in the browser?

PBKDF2 is available through native Web Crypto and avoids adding a
security-sensitive WASM dependency to the MVP. The cost is that PBKDF2 is
CPU-hard rather than memory-hard. A move to browser Argon2id would need
benchmarking plus a new envelope version and migration path; existing metadata
cannot be silently reinterpreted.

### Why the official MongoDB driver instead of an ODM?

The persistence surface is small, and the official driver keeps ownership
filters, indexes, optimistic revisions, and transaction boundaries visible.
Mongoose could add runtime schema middleware, but it would be another mapping
layer before the project has a measured need for it. DTO validation, typed
documents, idempotent index setup, and persistence tests provide the current
guardrails.

### Why Redis if MongoDB stores sessions?

MongoDB preserves durable session validity and revocation. Redis accelerates
lookups and stores rate-limit counters. If Redis is lost, the durable source of
truth remains; the application does not pretend the cache is the database.

### Why RabbitMQ for a password manager?

It demonstrates a realistic asynchronous security-event boundary without
putting the broker on vault CRUD's synchronous critical path. The transactional
outbox closes the database/message dual-write gap. The trade-off is operational
complexity and at-least-once delivery, so consumers must be idempotent.

### Why is vault search local?

Plaintext titles, domains, usernames, and user categories would turn a database
leak into an account inventory. KeyNest encrypts those fields and searches,
filters, and display-sorts them only after browser decryption. The server keeps
only operational metadata and a coarse item type, accepting more client work
and limited server-side pagination in exchange for less metadata leakage.

### Is it really zero knowledge?

Say **zero-knowledge-inspired**, not formally zero knowledge. The API does not
receive vault plaintext or the vault password, but delivered frontend code,
browser extensions, the local device, and XSS can access plaintext while the
vault is unlocked. The project has not received an independent security audit.

### What is WebMCP doing here?

WebMCP lets an open page register structured tools for a browser agent. KeyNest
uses it as progressive enhancement, not as a remote MCP server. The tool module
accepts only screen state and an aggregate count, registers a read-only status
tool, and registers the lock tool only while unlocked. Credential CRUD and
unlock are intentionally excluded because agent input/output is outside the
plaintext-vault boundary.

## What remains incomplete

- No production deployment, security certification, external audit, alert
  routing, restore drill, or load test
- No 2FA, passkeys, account/vault recovery, sharing, import/export, extension,
  mobile client, or Angular admin
- The worker does not yet perform a durable side effect that demonstrates a
  persisted idempotency record
- WebMCP is experimental and needs supported browser/agent tooling
- JavaScript cannot guarantee complete memory zeroization

## If asked about AI-assisted development

Answer honestly. A strong version is:

> I used AI as a pair-programming and review tool, but I treated generated code
> as untrusted. I defined the trust boundaries and acceptance criteria, reviewed
> the execution paths, ran the tests and builds, and documented the trade-offs.
> I can walk through the code and explain what I would change for production.

Do not claim independent authorship of decisions or code you cannot defend at a
whiteboard. The interview value is your demonstrated understanding and
judgement.
