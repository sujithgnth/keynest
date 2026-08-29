---
name: review-keynest-security
description: Review KeyNest changes for security regressions in client-side encryption, vault isolation, authentication, sessions, CSRF, authorization, database access, RabbitMQ delivery, logging, configuration, or external data flows. Use for security reviews of a diff, branch, pull request, feature design, or sensitive code path; review and report only unless the user explicitly requests fixes.
---

# Review KeyNest security

1. Read `AGENTS.md`, `docs/threat-model.md`, the relevant ADRs, and the actual
   changed execution path. Treat documentation as intent and code/tests as
   implementation evidence.
2. Trace sensitive data from source to every sink. Check browser/server
   separation, object ownership, parameterized queries, envelope integrity,
   nonce use, revision binding, session handling, CSRF, rate limits, and
   production configuration.
3. Inspect logs, metrics, audit metadata, outbox rows, RabbitMQ payloads, errors,
   fixtures, and external requests for secret exposure. Redaction alone is not
   proof of safety.
4. Check queue semantics for the transaction/outbox boundary, publisher
   confirms, durable delivery, bounded consumption, manual acknowledgements,
   retries, dead lettering, and durable consumer idempotency.
5. Validate important claims with a concrete path or focused test where safe.
   Do not modify code, dependencies, configuration, commits, or remote state
   unless the user explicitly asks for remediation.
6. Lead with actionable findings ordered by severity. For each finding, include
   the affected file and line, preconditions, source-to-sink path, impact, and
   missing control or test. If there are no findings, say so and list only the
   remaining verification gaps.
