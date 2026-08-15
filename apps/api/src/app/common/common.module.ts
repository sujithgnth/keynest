import { Global, Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { CsrfGuard } from './csrf.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Global()
@Module({
  imports: [SessionsModule],
  providers: [SessionAuthGuard, CsrfGuard],
  exports: [SessionAuthGuard, CsrfGuard],
})
export class CommonModule {}
