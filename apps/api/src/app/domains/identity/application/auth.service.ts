import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { LoginInput, RegisterInput } from './identity.inputs';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(registerDto: RegisterInput) {
    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    return this.usersService.createUser({
      name: registerDto.name,
      email: registerDto.email,
      passwordHash,
    });
  }

  async login(loginDto: LoginInput) {
    const user = await this.usersService.findByEmailWithPasswordHash(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = this.usersService.toPublicUser(user);
    const session = await this.sessionsService.createSession(publicUser.id);

    return {
      sessionId: session.sessionId,
      csrfToken: session.csrfToken,
      user: publicUser,
    };
  }

  currentUser(userId: string) {
    return this.usersService.findPublicById(userId);
  }
}
