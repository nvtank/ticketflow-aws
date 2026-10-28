import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import {
  CreateEventDto,
  EventFieldsDto,
  GridDto,
  OrganizerQueryDto,
  SeatEnabledDto,
  AssignStaffDto,
} from './events.dto';
import { OrganizerEventsService } from './organizer-events.service';
import { SeatDesignDto } from './seat-design.dto';
import { SeatManagementService } from './seat-management.service';
import { EventReviewService } from './event-review.service';
import { EventStaffService } from './event-staff.service';
@ApiTags('Organizer events')
@ApiBearerAuth()
@Roles(UserRole.ORGANIZER)
@Controller('organizer')
export class OrganizerEventsController {
  constructor(
    @Inject(OrganizerEventsService) private readonly events: OrganizerEventsService,
    @Inject(SeatManagementService) private readonly seats: SeatManagementService,
    @Inject(EventReviewService) private readonly review: EventReviewService,
    @Inject(EventStaffService) private readonly staff: EventStaffService,
  ) {}
  @Get('dashboard') overview(@CurrentPrincipal() p: Principal) {
    return this.events.overview(p.user.id);
  }
  @ApiQuery({ type: OrganizerQueryDto })
  @Get('events')
  list(@CurrentPrincipal() p: Principal, @Query() q: OrganizerQueryDto) {
    return this.events.list(p.user.id, q);
  }
  @Post('events') @ApiBody({ type: CreateEventDto }) create(
    @CurrentPrincipal() p: Principal,
    @Body() input: CreateEventDto,
  ) {
    return this.events.create(p.user.id, input);
  }
  @Delete('events/:id') @HttpCode(204) removeDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.events.remove(id, p.user.id);
  }
  @Get('events/:id') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.events.detail(id, p.user.id);
  }
  @Patch('events/:id') @ApiBody({ type: EventFieldsDto }) update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: EventFieldsDto,
  ) {
    return this.events.update(id, p.user.id, input);
  }
  @Post('events/:id/submit') @HttpCode(200) submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.review.submit(id, p.user.id);
  }
  @Post('events/:id/seat-map') @HttpCode(200) @ApiBody({ type: GridDto }) grid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: GridDto,
  ) {
    return this.seats.generate(id, p.user.id, input);
  }
  @Post('events/:id/seat-map/design') @HttpCode(200) @ApiBody({ type: SeatDesignDto }) design(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: SeatDesignDto,
  ) {
    return this.seats.saveDesign(id, p.user.id, input);
  }
  @Get('events/:id/seats') snapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.seats.snapshot(id, p.user.id);
  }
  @Patch('events/:id/seats/:seatId') @ApiBody({ type: SeatEnabledDto }) toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seatId', ParseUUIDPipe) seatId: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: SeatEnabledDto,
  ) {
    return this.seats.setEnabled(id, seatId, p.user.id, input.enabled);
  }
  @Get('events/:id/history') history(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.review.history(id, p.user.id);
  }
  @Get('events/:id/staff') assigned(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.staff.list(id, p.user.id);
  }
  @Post('events/:id/staff') @ApiBody({ type: AssignStaffDto }) assign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: AssignStaffDto,
  ) {
    return this.staff.assign(id, p.user.id, input.email);
  }
  @Delete('events/:id/staff/:staffId') @HttpCode(204) remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.staff.remove(id, p.user.id, staffId);
  }
}
