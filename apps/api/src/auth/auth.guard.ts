import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@tixflow/shared';
import { AuthProvider } from './auth-provider';
import { PUBLIC_ROUTE, REQUIRED_ROLES } from './auth.decorators';
import type { AuthRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthProvider) private readonly provider: AuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    const match =
      typeof header === 'string' && header.length < 4096 ? /^Bearer ([^\s]+)$/.exec(header) : null;
    if (!match?.[1]) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const principal = await this.provider.authenticate(match[1]);
    request.principal = principal;
    const roles = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES, targets);
    if (roles?.length && !roles.includes(principal.user.role))
      throw new ForbiddenException('Bạn không có quyền truy cập chức năng này.');
    return true;
  }
}
