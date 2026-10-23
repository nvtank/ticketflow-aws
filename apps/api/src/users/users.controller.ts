import { Body, Controller, HttpCode, Inject, Patch, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { UsersService } from './users.service';
import { ChangePasswordDto, UpdateProfileDto } from './users.dto';

@ApiTags('Own profile')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AuthCookieService) private readonly cookies: AuthCookieService,
  ) {}

  @Patch()
  @ApiBody({ type: UpdateProfileDto })
  async update(
    @CurrentPrincipal() principal: Principal,
    @Body() input: UpdateProfileDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.users.updateProfile(principal.user.id, input);
  }

  @Post('password')
  @HttpCode(204)
  @ApiBody({ type: ChangePasswordDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async password(
    @CurrentPrincipal() principal: Principal,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.users.changePassword(principal.user.id, input);
    this.cookies.clear(response);
    response.setHeader('Cache-Control', 'no-store');
  }
}
