import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

function createLogger(): Logger {
  const streams: pino.StreamEntry[] = [{ stream: process.stdout }];
  if (process.env.LOG_FILE) {
    streams.push({ stream: pino.destination(process.env.LOG_FILE) });
  }
  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: {
        service: process.env.SERVICE_NAME ?? 'keynest-api',
        environment: process.env.NODE_ENV ?? 'development',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          '*.password',
          '*.passwordHash',
          '*.masterPassword',
          '*.vaultKey',
          '*.ciphertext',
          '*.wrappedKey',
          '*.authorization',
          '*.cookie',
          'req.headers.authorization',
          'req.headers.cookie',
        ],
        censor: '[REDACTED]',
      },
    },
    pino.multistream(streams),
  );
}

@Injectable()
export class KeyNestLogger implements LoggerService {
  private readonly logger = createLogger();

  log(message: unknown, context?: string) {
    this.logger.info(this.fields(message, context));
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ ...this.fields(message, context), trace });
  }

  warn(message: unknown, context?: string) {
    this.logger.warn(this.fields(message, context));
  }

  debug(message: unknown, context?: string) {
    this.logger.debug(this.fields(message, context));
  }

  verbose(message: unknown, context?: string) {
    this.logger.trace(this.fields(message, context));
  }

  info(event: string, fields: Record<string, unknown> = {}) {
    this.logger.info(fields, event);
  }

  warning(event: string, fields: Record<string, unknown> = {}) {
    this.logger.warn(fields, event);
  }

  failure(event: string, error: unknown, fields: Record<string, unknown> = {}) {
    this.logger.error(
      {
        ...fields,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
      },
      event,
    );
  }

  private fields(message: unknown, context?: string): Record<string, unknown> {
    return typeof message === 'object' && message !== null
      ? { context, ...message }
      : { context, message: String(message) };
  }
}
