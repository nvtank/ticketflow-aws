import { createParamDecorator, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@tixflow/shared';
import type { AuthRequest, Principal } from './auth.types';

export const PUBLIC_ROUTE = 'tixflow.public';
export const REQUIRED_ROLES = 'tixflow.roles';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES, roles);
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal => {
    const principal = context.switchToHttp().getRequest<AuthRequest>().principal;
    if (!principal) throw new UnauthorizedException();
    return principal;
  },
);
