import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { Roles, CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './analytics.dto';
@ApiTags('Organizer analytics')
@ApiBearerAuth()
@Roles(UserRole.ORGANIZER)
@Controller('organizer/analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}
  @Get() @ApiQuery({ type: AnalyticsQueryDto }) get(
    @CurrentPrincipal() p: Principal,
    @Query() q: AnalyticsQueryDto,
  ) {
    return this.analytics.organizer(p.user.id, q);
  }
}
