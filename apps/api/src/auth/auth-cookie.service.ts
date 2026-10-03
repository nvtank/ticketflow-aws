import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';

export const REFRESH_COOKIE = 'tixflow_refresh';

@Injectable()
export class AuthCookieService {
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}
  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.environment.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    };
  }
  read(request: Request): string | undefined {
    const cookies: unknown = request.cookies;
    if (!cookies || typeof cookies !== 'object' || !(REFRESH_COOKIE in cookies)) return undefined;
    const value: unknown = cookies[REFRESH_COOKIE as keyof typeof cookies];
    return typeof value === 'string' && /^[\w-]{43}$/.test(value) ? value : undefined;
  }
  set(response: Response, value: string, expires: Date): void {
    response.cookie(REFRESH_COOKIE, value, { ...this.options(), expires });
  }
  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, this.options());
  }
}
