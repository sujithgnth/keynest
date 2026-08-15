import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../common/csrf.guard';
import { KeyNestRequest, principalOf } from '../common/request-context';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(SessionAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(@Req() request: KeyNestRequest) {
    return this.sessionsService.listForUser(principalOf(request).userId);
  }

  @Post('revoke-all')
  @UseGuards(CsrfGuard)
  async revokeAll(@Req() request: KeyNestRequest) {
    await this.sessionsService.revokeAllForUser(principalOf(request).userId);
    return { revoked: true };
  }
}
