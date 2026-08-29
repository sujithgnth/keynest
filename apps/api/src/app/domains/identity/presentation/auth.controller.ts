import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  KeyNestRequest,
  principalOf,
} from '../../../platform/http/request-context';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session.constants';
import { AuthService } from '../application/auth.service';
import { SessionsService } from '../application/sessions.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { CsrfGuard } from './csrf.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthRateLimitGuard)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    response.cookie(
      SESSION_COOKIE_NAME,
      result.sessionId,
      this.cookieOptions(),
    );
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@Req() request: KeyNestRequest) {
    const principal = principalOf(request);
    return {
      user: await this.authService.currentUser(principal.userId),
      csrfToken: await this.sessionsService.rotateCsrfToken(
        principal.sessionId,
      ),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async logout(
    @Req() request: KeyNestRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessionsService.revokeSession(principalOf(request).sessionId);
    response.clearCookie(SESSION_COOKIE_NAME, {
      ...this.cookieOptions(),
      maxAge: undefined,
    });
    return { loggedOut: true };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      maxAge: SESSION_TTL_MS,
      path: '/api',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };
  }
}
