import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthProvider } from './auth-provider';
import { LocalJwtAuthProvider } from './local-jwt.provider';
import { PasswordService } from './password.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth-cookie.service';
import { CookieOriginGuard } from './cookie-origin.guard';
import { WorkspacesController } from './workspaces.controller';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    PasswordService,
    AuthService,
    AuthCookieService,
    CookieOriginGuard,
    { provide: AuthProvider, useClass: LocalJwtAuthProvider },
  ],
  controllers: [AuthController, WorkspacesController],
  exports: [AuthProvider, PasswordService, AuthService, AuthCookieService],
})
export class AuthModule {}
