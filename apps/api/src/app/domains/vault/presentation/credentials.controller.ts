import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CsrfGuard, SessionAuthGuard } from '../../identity/public-api';
import {
  KeyNestRequest,
  principalOf,
} from '../../../platform/http/request-context';
import { CredentialsService } from '../application/credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@Controller('credentials')
@UseGuards(SessionAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  list(@Req() request: KeyNestRequest) {
    return this.credentialsService.list(principalOf(request).userId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@Req() request: KeyNestRequest, @Body() dto: CreateCredentialDto) {
    return this.credentialsService.create(principalOf(request).userId, dto);
  }

  @Put(':id')
  @UseGuards(CsrfGuard)
  update(
    @Req() request: KeyNestRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    return this.credentialsService.update(principalOf(request).userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  remove(
    @Req() request: KeyNestRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.credentialsService.remove(principalOf(request).userId, id);
  }
}
