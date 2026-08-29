---
name: verify-keynest-change
description: Validate KeyNest repository changes with proportionate formatting, lint, tests, builds, runtime smoke checks, and distributed-system evidence. Use after implementation, before a commit or pull request update, when investigating a failing check, or when deciding whether a KeyNest behavior is statically verified or proven end to end.
---

# Verify a KeyNest change

1. Read `AGENTS.md`, inspect the current Git diff, and map every changed file to
   the behavior and trust boundary it can affect.
2. Start with the narrowest relevant test, then run the standard repository gate
   with `npm run verify` unless the request explicitly limits validation.
3. For API, schema, session, outbox, RabbitMQ, worker, or observability changes,
   use the local stack when available: run `npm run infra:up`,
   `npm run db:migrate`, and `npm run test:e2e`.
4. For distributed behavior, inspect the durable database state, outbox event,
   message contents, acknowledgement/retry behavior, worker output, redacted
   logs, and relevant metrics. Use synthetic sentinels and confirm they do not
   appear outside the browser boundary.
5. Do not infer runtime success from compilation, unit tests, a visible UI, or a
   dashboard. If infrastructure is unavailable, label runtime verification as
   not run and give the exact remaining command.
6. Report commands, pass/fail results, the behavior each result proves, and any
   residual risk. Do not hide flaky or skipped checks.
