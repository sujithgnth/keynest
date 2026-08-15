import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { loadRuntimeConfig } from './app/config/runtime-config';
import { HttpExceptionEnvelopeFilter } from './app/observability/http-exception.filter';
import { KeyNestLogger } from './app/observability/keynest-logger.service';
import { MetricsService } from './app/observability/metrics.service';

async function bootstrap() {
  const config = loadRuntimeConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(KeyNestLogger);
  const metrics = app.get(MetricsService);
  app.useLogger(logger);
  app.enableShutdownHooks();
  if (config.trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.allowedOrigins,
    credentials: true,
    allowedHeaders: ['content-type', 'x-keynest-csrf', 'x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  app.use(
    (
      request: Request & { id?: string },
      response: Response,
      next: () => void,
    ) => {
      const suppliedId = request.header('x-request-id');
      request.id =
        suppliedId && /^[a-zA-Z0-9_-]{8,100}$/.test(suppliedId)
          ? suppliedId
          : randomUUID();
      response.setHeader('x-request-id', request.id);
      response.setHeader('cache-control', 'no-store');
      const started = process.hrtime.bigint();
      response.on('finish', () => {
        const seconds =
          Number(process.hrtime.bigint() - started) / 1_000_000_000;
        const labels = {
          method: request.method,
          route: request.route?.path ?? request.path ?? 'unknown',
          status: String(response.statusCode),
        };
        metrics.httpRequests.inc(labels);
        metrics.httpDuration.observe(labels, seconds);
        logger.info('http.request.completed', {
          requestId: request.id,
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Math.round(seconds * 1000),
        });
      });
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionEnvelopeFilter(logger));
  await app.listen(config.port, '0.0.0.0');
  logger.info('application.started', {
    port: config.port,
    basePath: '/api',
  });
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: 'fatal',
      event: 'application.startup_failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
