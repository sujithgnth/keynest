# AI Privacy Design

Last updated: August 15, 2026

## Current architecture

KeyNest is an Nx monorepo with a working Next.js browser vault, a NestJS API,
PostgreSQL-backed durable state, Redis-assisted sessions and auth rate limits,
RabbitMQ security events, and shared TypeScript libraries. Vault storage,
credential storage, browser cryptography, audit events, and the personal-vault
UI are implemented.

AI must be an optional assistant around this system. It is not part of the
trusted cryptographic or authentication core.

## Proposed data flow

```txt
decrypted vault in browser
        |
        | deterministic, local analysis
        v
allow-listed aggregate/redacted result
        |
        | explicit opt-in
        v
AI privacy boundary in API
        |
        | schema validation + secret-key rejection
        v
remote model adapter (not implemented)
        |
        v
untrusted text/structured response
        |
        | validate, escape, label as advice
        v
browser UI
```

Documentation questions follow a separate route. The API retrieves only from an
approved documentation corpus, constructs a cited context payload through the
same privacy boundary, and sends no vault data. Retrieved text is treated as
untrusted data, not as model instructions.

Local semantic vault search does not use this remote route. It must run in the
browser or through a future on-device model abstraction.

## Information allowed to reach a remote model

- Aggregate password-health counts, such as total accounts and reused-password
  counts
- A documentation question explicitly submitted to the assistant
- Excerpts and links from the approved product-documentation corpus
- Deterministic phishing finding codes and normalized hostnames only
- Non-sensitive feature and schema-version identifiers

## Information forbidden from reaching a remote model

- Master or account passwords, password hashes, and saved passwords
- Vault keys, derived keys, private keys, TOTP seeds, and recovery codes
- Secure notes, decrypted records, and raw credential-import data
- Cookies, session IDs, access tokens, refresh tokens, and authorization headers
- Full URLs, URL paths, query strings, fragments, or embedded credentials
- Raw usernames, email addresses, vault item identifiers, and credential values

The boundary uses allow-listed construction rather than accepting arbitrary
vault-shaped objects. It also rejects forbidden property names recursively as
defense in depth. This cannot identify every secret pasted into arbitrary prose;
documentation questions therefore require clear user disclosure and must never
be enriched with vault content.

## Components

- `apps/api/src/app/ai/privacy/ai-privacy-boundary.ts`: implemented pure
  allow-list boundary
- `apps/api/src/app/ai/privacy/ai-privacy-boundary.spec.ts`: implemented leakage
  and malformed-input tests
- Future `apps/api/src/app/ai`: opt-in configuration, rate limiting, model
  adapter, documentation retrieval, response validation, and safe logging
- Future `apps/web`: consent UI, local health analysis, local search, and
  untrusted-output rendering
- `libs/crypto`: implemented password generation and cryptography only; it does
  not depend on AI code

## Risks and mitigations

| Risk                                             | Mitigation                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Secrets enter a prompt through a broad object    | Construct new payloads from explicit scalar fields; reject forbidden keys                 |
| Prompt injection in retrieved documents          | Use an approved corpus, separate instructions from context, and treat excerpts as data    |
| Model advice is mistaken for a security decision | Keep checks deterministic and label generated explanations as advice                      |
| Model output causes script execution             | Never render raw HTML; validate structured output and escape text                         |
| Sensitive telemetry or errors are retained       | Log only feature, request ID, timing, status, and aggregate sizes                         |
| AI outage blocks the password manager            | Keep AI optional, separately configured, time-bounded, and fail closed                    |
| URLs leak secrets                                | Normalize locally and permit hostnames only for the phishing feature                      |
| Tool calls bypass authorization                  | Start read-only, validate arguments, and enforce ordinary authorization outside the model |

## Implementation sequence

1. Privacy boundary and leakage tests
2. Approved-corpus documentation assistant
3. Aggregate password-health explanations
4. Local semantic search abstraction
5. Deterministic phishing findings with optional explanations
6. Local deterministic import mapping
7. Narrow, read-only tool calling

Each phase must test malicious and malformed inputs and inspect outbound payloads
and log metadata for secret leakage before the next phase begins.
