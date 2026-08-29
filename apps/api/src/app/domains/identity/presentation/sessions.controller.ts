import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  KeyNestRequest,
  principalOf,
} from '../../../platform/http/request-context';
import { SessionsService } from '../application/sessions.service';
import { CsrfGuard } from './csrf.guard';
import { SessionAuthGuard } from './session-auth.guard';

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
