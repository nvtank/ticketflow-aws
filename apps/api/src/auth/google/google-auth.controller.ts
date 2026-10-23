import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ENVIRONMENT } from '../../config/configuration.module';
import type { Environment } from '../../config/environment';
import { Public, CurrentPrincipal } from '../auth.decorators';
import type { Principal } from '../auth.types';
import { CookieOriginGuard } from '../cookie-origin.guard';
import { AuthService } from '../auth.service';
import { AuthCookieService } from '../auth-cookie.service';
import { GoogleCredentialDto } from './google.dto';
import { GoogleChallengeService } from './google-challenge.service';
import { GoogleTokenVerifier } from './google-token-verifier';
@ApiTags('Google authentication')
@UseGuards(CookieOriginGuard)
@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(GoogleChallengeService) private readonly challenges: GoogleChallengeService,
    @Inject(GoogleTokenVerifier) private readonly verifier: GoogleTokenVerifier,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthCookieService) private readonly cookies: AuthCookieService,
  ) {}
  @Public() @Get('config') config(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return { enabled: !!this.env.GOOGLE_CLIENT_ID };
  }
  @Public() @Post('challenge') @Throttle({ default: { limit: 15, ttl: 60000 } }) challenge(
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.challenges.create(res, 'login');
  }
  @ApiBearerAuth()
  @Post('link/challenge')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  linkChallenge(@CurrentPrincipal() p: Principal, @Res({ passthrough: true }) res: Response) {
    return this.challenges.create(res, 'link', p.user.id, p.sessionId);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiBody({ type: GoogleCredentialDto })
  async login(
    @Body() input: GoogleCredentialDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const proof = await this.challenges.inspect(req, 'login');
      const identity = await this.verifier.verify(input.credential, proof.nonce);
      await this.challenges.consume(proof);
      const result = await this.auth.googleLogin(identity);
      this.cookies.set(res, result.refreshToken, result.refreshExpiresAt);
      return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn };
    } finally {
      this.challenges.clear(res);
    }
  }
  @ApiBearerAuth()
  @Post('link')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiBody({ type: GoogleCredentialDto })
  async link(
    @CurrentPrincipal() p: Principal,
    @Body() input: GoogleCredentialDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const proof = await this.challenges.inspect(req, 'link', p.user.id, p.sessionId);
      const identity = await this.verifier.verify(input.credential, proof.nonce);
      await this.challenges.consume(proof);
      return await this.auth.linkGoogle(p.user.id, p.sessionId, identity);
    } finally {
      this.challenges.clear(res);
    }
  }
}
