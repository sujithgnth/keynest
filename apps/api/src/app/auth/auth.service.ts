import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    return this.usersService.createUser({
      name: registerDto.name,
      email: registerDto.email,
      passwordHash,
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPasswordHash(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = this.usersService.toPublicUser(user);
    const sessionId = await this.sessionsService.createSession(publicUser.id);

    return {
      sessionId,
      user: publicUser,
    };
  }
}
