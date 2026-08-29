import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../identity/public-api';
import {
  KeyNestRequest,
  principalOf,
} from '../../../platform/http/request-context';
import { AuditLogsService } from '../application/audit-logs.service';

@Controller('audit-logs')
@UseGuards(SessionAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@Req() request: KeyNestRequest) {
    return this.auditLogsService.listForUser(principalOf(request).userId);
  }
}
