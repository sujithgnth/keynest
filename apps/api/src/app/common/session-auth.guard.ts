import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SESSION_COOKIE_NAME } from '../sessions/session.constants';
import { SessionsService } from '../sessions/sessions.service';
import { KeyNestRequest } from './request-context';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<KeyNestRequest>();
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (typeof sessionId !== 'string' || sessionId.length < 32) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessionsService.getActiveSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    request.principal = {
      userId: session.userId,
      sessionId,
      csrfTokenHash: session.csrfTokenHash,
    };
    return true;
  }
}
