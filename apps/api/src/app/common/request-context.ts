import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  csrfTokenHash: string;
}

export type KeyNestRequest = Request & {
  id?: string;
  principal?: AuthenticatedPrincipal;
};

export function principalOf(request: KeyNestRequest): AuthenticatedPrincipal {
  if (!request.principal) {
    throw new UnauthorizedException('Authentication required');
  }
  return request.principal;
}
