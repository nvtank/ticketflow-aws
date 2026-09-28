import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';

@Injectable()
export class CookieOriginGuard implements CanActivate {
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origin = request.headers.origin;
    if (
      request.headers['sec-fetch-site'] === 'cross-site' ||
      (origin !== undefined && !this.environment.CORS_ORIGINS.includes(origin))
    ) {
      throw new ForbiddenException('Nguồn yêu cầu không được phép.');
    }
    // Non-browser API clients without Origin may use these endpoints. Browsers
    // cannot forge Origin/Sec-Fetch-Site; SameSite cookie adds another boundary.
    return true;
  }
}
