import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpRequests = new Counter({
    name: 'keynest_http_requests_total',
    help: 'Total HTTP requests handled by the API',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });
  readonly httpDuration = new Histogram({
    name: 'keynest_http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });
  readonly outboxPublished = new Counter({
    name: 'keynest_outbox_published_total',
    help: 'Outbox messages confirmed by RabbitMQ',
    registers: [this.registry],
  });
  readonly outboxFailures = new Counter({
    name: 'keynest_outbox_publish_failures_total',
    help: 'Outbox publish failures',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'keynest_' });
  }
}
