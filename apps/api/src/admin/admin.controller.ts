import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { AdminService } from './admin.service';
import {
  AccountAccessDto,
  UserQueryDto,
  OrganizationQueryDto,
  OrganizationReviewDto,
} from './admin.dto';
@ApiTags('Admin management')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly service: AdminService) {}
  @Get('dashboard') dashboard() {
    return this.service.dashboard();
  }
  @Get('monitoring') monitoring() {
    return this.service.monitoring();
  }
  @Get('users') @ApiQuery({ type: UserQueryDto }) users(@Query() q: UserQueryDto) {
    return this.service.users(q);
  }
  @Get('users/:id') user(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.user(id);
  }
  @Patch('users/:id/access') @ApiBody({ type: AccountAccessDto }) access(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: AccountAccessDto,
  ) {
    return this.service.access(id, p.user.id, input);
  }
  @Get('organizations') @ApiQuery({ type: OrganizationQueryDto }) organizations(
    @Query() q: OrganizationQueryDto,
  ) {
    return this.service.organizations(q);
  }
  @Patch('organizations/:id/review') @ApiBody({ type: OrganizationReviewDto }) review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: OrganizationReviewDto,
  ) {
    return this.service.review(id, p.user.id, input);
  }
  @Get('organizations/:id/history') history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.organizationHistory(id);
  }
}
