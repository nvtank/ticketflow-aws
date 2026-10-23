import { GoogleAuthController } from './google/google-auth.controller';
import { GoogleChallengeService } from './google/google-challenge.service';
import {
  GoogleTokenVerifier,
  GOOGLE_OAUTH_CLIENT,
  createGoogleVerificationClient,
} from './google/google-token-verifier';
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
    GoogleChallengeService,
    GoogleTokenVerifier,
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useFactory: createGoogleVerificationClient,
    },
    PasswordService,
    AuthService,
    AuthCookieService,
    CookieOriginGuard,
    { provide: AuthProvider, useClass: LocalJwtAuthProvider },
  ],
  controllers: [AuthController, WorkspacesController, GoogleAuthController],
  exports: [AuthProvider, PasswordService, AuthService, AuthCookieService],
})
export class AuthModule {}
