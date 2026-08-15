import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { KeyNestRequest } from '../common/request-context';
import { KeyNestLogger } from './keynest-logger.service';

@Catch()
export class HttpExceptionEnvelopeFilter implements ExceptionFilter {
  constructor(private readonly logger: KeyNestLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<KeyNestRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.message(detail, status);
    const code = this.code(status);

    const fields = {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      status,
      userId: request.principal?.userId,
    };
    if (status >= 500) {
      this.logger.failure('http.request.failed', exception, fields);
    } else {
      this.logger.warning('http.request.rejected', fields);
    }

    response.status(status).json({
      error: { code, message, requestId: request.id },
    });
  }

  private message(detail: unknown, status: number): string | string[] {
    if (status >= 500) return 'Internal server error';
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) return message;
    }
    return 'Request failed';
  }

  private code(status: number): string {
    return (
      {
        400: 'VALIDATION_ERROR',
        401: 'UNAUTHENTICATED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'RATE_LIMITED',
      }[status] ?? 'INTERNAL_ERROR'
    );
  }
}
