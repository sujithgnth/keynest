# KeyNest Operations Runbook

Last verified: August 22, 2026

This runbook covers the local Docker Compose environment. It is not a
production deployment guide.

## Start and stop

```bash
docker compose up -d --build
docker compose ps -a
docker compose down
```

`docker compose down` preserves named volumes. Adding `--volumes` deletes the
local database, Redis data, RabbitMQ state, metrics, logs, and Grafana state;
use it only when that data is intentionally disposable.

PostgreSQL is published on host port 5433 to avoid collisions with a common
local 5432 installation. Containers use `postgres:5432` internally.

## Temporary public demo

The web container uses same-origin `/api` requests and proxies them internally
to `api:3333`. A short-lived HTTPS tunnel therefore needs to expose only the
web service; never tunnel PostgreSQL, Redis, RabbitMQ, Grafana, Prometheus,
Loki, or the API port directly.

Start the stack, then create a free Cloudflare Quick Tunnel in a separate
terminal:

```bash
docker compose up -d --build
docker run --rm --network keynest_default cloudflare/cloudflared:latest \
  tunnel --no-autoupdate --url http://web:3000
```

Cloudflare prints a random `https://*.trycloudflare.com` URL. Add that exact
origin to the API CORS allow-list and recreate only the API container:

```bash
WEB_ORIGINS=http://localhost:3000,https://example.trycloudflare.com \
  docker compose up -d --no-deps --force-recreate api
```

Verify both the WIP page and readiness through the public URL before sharing
it. Quick Tunnels are for temporary demonstrations only: the hostname changes
when the tunnel restarts, the link works only while this machine and Docker are
running, and the project must still be used with synthetic credentials only.
Stop the tunnel with `Ctrl+C`; this does not delete KeyNest data.

## Readiness checks

```bash
curl -fsS http://localhost:3333/api/health/live
curl -fsS http://localhost:3333/api/health/ready
curl -fsS http://localhost:9090/-/ready
curl -fsS http://localhost:3100/ready
curl -fsS -u keynest:keynest http://localhost:15672/api/health/checks/alarms
```

API readiness requires PostgreSQL, Redis, and RabbitMQ. The migration service
should exit with code 0; it is not expected to remain running.

## Logs

```bash
docker compose logs -f api worker
docker compose logs --since=10m rabbitmq prometheus loki promtail grafana
```

API and worker logs are JSON, include service/environment metadata, and redact
known password, key, token, cookie, authorization, and ciphertext fields.
Promtail reads the shared log volume and sends records to Loki. In Grafana,
open the provisioned **KeyNest service overview** dashboard or Explore the Loki
query `{job="keynest"}`.

Log redaction is defense in depth. Callers must still avoid placing secrets in
free-form messages, URLs, error text, or audit metadata.

## Metrics and dashboard

Prometheus scrapes `api:3333/api/metrics` every 15 seconds. The provisioned
dashboard includes request rate, 5xx ratio, p95 latency, outbox publishing, and
application logs.

Check the target directly:

```bash
curl -fsS 'http://localhost:9090/api/v1/targets?state=active'
```

No paging integration or production alert receiver is configured. The local
dashboard is evidence of instrumentation, not evidence of a production SLO.

## RabbitMQ and the outbox

The API writes an audit event and its outbox record in one PostgreSQL
transaction. The publisher selects pending records with `FOR UPDATE SKIP
LOCKED`, publishes persistent messages through a confirm channel, and marks a
record published only after broker confirmation.

The `keynest.security-events` queue is durable. The worker uses manual
acknowledgements and prefetch 20. Invalid messages are rejected without
requeueing and reach `keynest.security-events.dead` through the dead-letter
exchange.

This is at-least-once delivery: a crash after RabbitMQ confirmation but before
the PostgreSQL commit can cause a duplicate. Message IDs are stable, so a
future side-effecting consumer must persist processed IDs or make its operation
idempotent.

Inspect queue state at http://localhost:15672 or with:

```bash
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

## Database migrations and backup

Migrations are ordered SQL files in `infrastructure/postgres/migrations`. They
are recorded in `schema_migrations` and run transactionally:

```bash
npm run db:migrate
```

For a local logical backup:

```bash
docker compose exec -T postgres pg_dump -U keynest -d keynest -Fc > keynest.dump
```

The dump still contains authentication hashes, session hashes, vault metadata,
and encrypted secrets; handle it as sensitive data. Redis and RabbitMQ are not
the durable source of truth for vault records.

## Common failure cases

| Symptom                           | Check                                                          |
| --------------------------------- | -------------------------------------------------------------- |
| API remains unhealthy             | `docker compose logs migrate api`                              |
| Readiness reports Redis down      | `docker compose logs redis api`                                |
| Readiness reports RabbitMQ down   | Rabbit health and API publisher connection logs                |
| Dashboard has no metrics          | Prometheus target health and `/api/metrics`                    |
| Dashboard has no logs             | shared `keynest_logs` volume, Promtail targets, Loki readiness |
| Outbox rows remain unpublished    | API `outbox.flush.failed` logs and RabbitMQ alarms             |
| Worker queue grows                | worker health/logs, consumers, and dead-letter queue           |
| Browser requests fail after login | API CORS origin, cookie Secure/SameSite settings, and HTTPS    |

## Production gaps

Before remote deployment: use a secret manager, strong unique credentials,
TLS, a same-site origin strategy, network isolation for management ports,
database backups with restore drills, alert routing, retention policies,
dependency/image scanning, CSP hardening, load tests, and an independent
security review.
