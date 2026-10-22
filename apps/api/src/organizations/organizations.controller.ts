import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@Controller('organizations')
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizations: OrganizationsService) {}

  @Get('me')
  mine(@CurrentPrincipal() principal: Principal) {
    return this.organizations.listMine(principal.user.id);
  }

  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentPrincipal() principal: Principal) {
    return this.organizations.getForMember(id, principal);
  }
}
