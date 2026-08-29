import {
  Body,
  Controller,
  Get,
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
import { VaultService } from '../application/vault.service';
import { BootstrapVaultDto } from './dto/bootstrap-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';

@Controller('vault')
@UseGuards(SessionAuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  async get(@Req() request: KeyNestRequest) {
    return {
      vault: await this.vaultService.getForUser(principalOf(request).userId),
    };
  }

  @Post()
  @UseGuards(CsrfGuard)
  bootstrap(@Req() request: KeyNestRequest, @Body() dto: BootstrapVaultDto) {
    return this.vaultService.bootstrap(principalOf(request).userId, dto);
  }

  @Put()
  @UseGuards(CsrfGuard)
  rotate(@Req() request: KeyNestRequest, @Body() dto: UpdateVaultDto) {
    return this.vaultService.rotate(principalOf(request).userId, dto);
  }
}
