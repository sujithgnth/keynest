---
name: implement-keynest-change
description: Implement safe, narrowly scoped changes in the KeyNest password-manager repository across the Next.js web app, NestJS API, worker, shared libraries, database, messaging, or observability stack. Use for feature work, refactors, fixes, migrations, infrastructure changes, and cross-layer vertical slices that must preserve KeyNest security and operational boundaries.
---

# Implement a KeyNest change

1. Read the repository `AGENTS.md`, inspect `git status` and the relevant code,
   tests, configuration, and documents. Preserve unrelated changes.
2. Map the request to the owning surface: browser, API, PostgreSQL, Redis,
   RabbitMQ/worker, or observability. State the trust boundary and expected
   failure behavior before changing it.
3. For crypto, auth, session, queue, logging, or data-model work, read the
   relevant ADR and `docs/threat-model.md` first.
4. Implement the smallest end-to-end slice that delivers the requested
   behavior. Reuse existing services and contracts; avoid speculative
   abstractions and unrelated rewrites.
5. Keep plaintext vault data and secrets out of server paths, messages, logs,
   metrics, fixtures, screenshots, and external requests. Use synthetic sentinel
   values for leakage tests.
6. Add tests at the closest useful boundary. Include negative and failure-path
   coverage for authorization, tampering, retries, idempotency, or redaction
   when those concerns are affected.
7. Update ADRs, the threat model, runbook, and implementation status when the
   corresponding contract changes.
8. Invoke `$verify-keynest-change` and report static evidence separately from
   runtime evidence and remaining limitations.
