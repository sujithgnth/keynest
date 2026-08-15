import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { KeyNestRequest, principalOf } from '../common/request-context';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(SessionAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@Req() request: KeyNestRequest) {
    return this.auditLogsService.listForUser(principalOf(request).userId);
  }
}
