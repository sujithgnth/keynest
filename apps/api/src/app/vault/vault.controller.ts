import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CsrfGuard } from '../common/csrf.guard';
import { KeyNestRequest, principalOf } from '../common/request-context';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { BootstrapVaultDto } from './dto/bootstrap-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import { VaultService } from './vault.service';

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
