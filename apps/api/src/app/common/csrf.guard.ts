import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { KeyNestRequest } from './request-context';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<KeyNestRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const token = request.header('x-keynest-csrf');
    const expected = request.principal?.csrfTokenHash;
    if (!token || !expected) {
      throw new ForbiddenException('Missing CSRF token');
    }

    const actual = createHash('sha256').update(token).digest();
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (
      actual.length !== expectedBuffer.length ||
      !timingSafeEqual(actual, expectedBuffer)
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
