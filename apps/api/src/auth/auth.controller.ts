import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthResponse } from '@tixflow/shared';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { Public, CurrentPrincipal } from './auth.decorators';
import type { AuthResult, Principal } from './auth.types';
import { AuthCookieService } from './auth-cookie.service';
import { CookieOriginGuard } from './cookie-origin.guard';

@ApiTags('Authentication')
@UseGuards(CookieOriginGuard)
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthCookieService) private readonly cookies: AuthCookieService,
  ) {}

  private respond(response: Response, result: AuthResult): AuthResponse {
    response.setHeader('Cache-Control', 'no-store');
    this.cookies.set(response, result.refreshToken, result.refreshExpiresAt);
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiOperation({ summary: 'Register a CUSTOMER; roles cannot be supplied by the client' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(@Body() input: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.respond(response, await this.auth.register(input));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.respond(response, await this.auth.login(input));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('tixflow_refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return this.respond(response, await this.auth.refresh(this.cookies.read(request)));
    } catch (error) {
      if (error instanceof UnauthorizedException) this.cookies.clear(response);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const header = request.headers.authorization;
    const accessToken =
      header && header.length < 4096 ? /^Bearer ([^\s]+)$/.exec(header)?.[1] : undefined;
    await this.auth.logout(this.cookies.read(request), accessToken);
    this.cookies.clear(response);
    response.setHeader('Cache-Control', 'no-store');
  }

  @Get('methods')
  @ApiBearerAuth()
  methods(@CurrentPrincipal() p: Principal, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.auth.methods(p.user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentPrincipal() principal: Principal, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return principal.user;
  }
}
