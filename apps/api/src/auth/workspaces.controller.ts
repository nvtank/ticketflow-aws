import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from './auth.decorators';
import type { Principal } from './auth.types';

@ApiTags('Workspace access')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  @Get('organizer')
  @Roles(UserRole.ORGANIZER)
  organizer(@CurrentPrincipal() principal: Principal) {
    return { workspace: 'organizer', user: principal.user };
  }

  @Get('staff')
  @Roles(UserRole.STAFF)
  staff(@CurrentPrincipal() principal: Principal) {
    return { workspace: 'staff', user: principal.user };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  admin(@CurrentPrincipal() principal: Principal) {
    return { workspace: 'admin', user: principal.user };
  }
}
