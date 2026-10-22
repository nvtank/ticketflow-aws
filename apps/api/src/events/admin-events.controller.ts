import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { EventReviewService } from './event-review.service';
import { PageDto, RejectEventDto } from './events.dto';
@ApiTags('Admin event review')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/events')
export class AdminEventsController {
  constructor(@Inject(EventReviewService) private readonly review: EventReviewService) {}
  @ApiQuery({ type: PageDto })
  @Get('pending')
  pending(@Query() q: PageDto) {
    return this.review.pending(q);
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.review.detail(id);
  }
  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string) {
    return this.review.history(id);
  }
  @Patch(':id/approve') approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.review.decide(id, p.user.id, true);
  }
  @Patch(':id/reject') @ApiBody({ type: RejectEventDto }) reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: RejectEventDto,
  ) {
    return this.review.decide(id, p.user.id, false, input.reason);
  }
}
