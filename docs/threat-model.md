# KeyNest Threat Model

Last reviewed: August 15, 2026

## Scope and security objective

This model covers the personal-vault MVP running in a browser, NestJS API,
PostgreSQL, Redis, RabbitMQ, worker, and observability stack. Its primary goal is
to prevent the API and a database-only attacker from learning plaintext vault
credentials. It does not claim protection after an attacker controls the
unlocked browser, operating system, or shipped frontend code.

## Assets

- Vault master password and derived wrapping key
- Unwrapped vault key and decrypted credential fields
- Account-password hashes and authenticated sessions
- Encrypted vault/item envelopes and their integrity metadata
- Audit history and security-event delivery state
- Availability of authentication, vault access, and recovery-free unlock

## Trust boundaries

```mermaid
flowchart LR
  U["User"] --> B["Browser / decrypted memory boundary"]
  B -->|"TLS in production: auth data or ciphertext"| A["API boundary"]
  A --> P[("PostgreSQL: durable source of truth")]
  A --> R[("Redis: cache and rate limits")]
  A --> Q[("RabbitMQ: asynchronous events")]
  Q --> W["Worker"]
  A --> O["Metrics and redacted logs"]
  W --> O
```

The browser cryptographic boundary is trusted while the tab and delivered
JavaScript are uncompromised. PostgreSQL, Redis, RabbitMQ, logs, metrics, and a
future AI integration are outside the plaintext-vault boundary.

## Threats and controls

| Threat                                      | Current controls                                                                                                                  | Important residual risk                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Database disclosure                         | AES-256-GCM item envelopes; separately wrapped random vault key; account/session tokens stored as hashes                          | An attacker can perform offline guesses against the wrapped vault key; user password strength and KDF cost matter                   |
| Ciphertext substitution or rollback         | GCM authentication and AAD bind vault ID, item ID, type, envelope version, and revision; optimistic revisions reject stale writes | A full database attacker may restore a mutually consistent older snapshot; no trusted external rollback counter exists              |
| XSS or compromised frontend supply chain    | No raw HTML rendering, restrictive response headers/CSP baseline, no remote scripts, non-extractable Web Crypto keys, idle lock   | `unsafe-inline` is currently needed for Next.js bootstrap; malicious shipped code or an extension can read plaintext while unlocked |
| Broken object-level authorization           | Every item query joins through the authenticated vault owner; item IDs alone do not authorize access                              | Requires continued negative tests as sharing/organization features are introduced                                                   |
| Session theft                               | 256-bit opaque cookie, HttpOnly, Secure in production, SameSite=Lax, server-side token hash, expiry and revocation                | Malware, a compromised browser, or incorrect proxy/TLS configuration can still expose or replay a live session                      |
| CSRF                                        | Per-session random token, server-side token hash, constant-time comparison, CORS allow-list, SameSite cookie                      | Any future state-changing route must keep both auth and CSRF guards                                                                 |
| Credential stuffing / Argon2 resource abuse | Generic login errors and Redis per-IP login/register limits                                                                       | Current limits fail open during Redis errors and do not replace an edge/WAF distributed limit                                       |
| Sensitive logs or events                    | Allow-listed audit metadata, forbidden sensitive keys, Pino redaction, no credential payload in Rabbit events                     | Free-form error text and future fields require review; redaction is not proof that arbitrary secret values cannot leak              |
| Lost or duplicated async events             | PostgreSQL audit/outbox transaction, publisher confirms, persistent messages, manual ack, stable event ID, DLQ                    | Delivery is at least once; side-effecting consumers must implement durable idempotency                                              |
| Dependency or image compromise              | Lockfile, pinned infrastructure images, production dependency audit in CI                                                         | Dev-tool advisories and upstream compromise remain; image signing/SBOM/scanning are not yet enforced                                |
| Clipboard or screen disclosure              | Passwords masked by default and shown only on request                                                                             | Clipboard managers, screenshots, shoulder surfing, and accessibility tooling are outside the app boundary                           |
| Lost master password                        | Clear setup warning and no server-side key escrow                                                                                 | Vault data is unrecoverable by design                                                                                               |

## Explicit non-goals for this MVP

- Protecting plaintext after the local device or unlocked browser is compromised
- Hiding access timing, ciphertext length, item count, item type, or timestamps
- Multi-user sharing, recovery escrow, 2FA, passkeys, or enterprise policy
- Defending a remote deployment that lacks TLS, secret management, network
  isolation, monitoring, and secure backups
- Claiming professional security certification or audit coverage

## Verification obligations

Before changing the envelope format, authentication guards, session cookie,
audit schema, or queue semantics:

1. Add round-trip and tamper tests for the new format.
2. Prove cross-user item access is rejected.
3. Inspect database, audit, outbox, logs, and Rabbit payloads for synthetic
   plaintext sentinels.
4. Exercise dependency failure and retry behavior.
5. Update the ADR, this model, and the operations runbook.
