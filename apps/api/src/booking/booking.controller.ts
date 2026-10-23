import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Inject,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@tixflow/shared';
import { Roles, CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { CreateHoldDto } from './booking.dto';
import { SeatHoldsService } from './seat-holds.service';
import { HoldLifecycleService } from './hold-lifecycle.service';
import { BookingSnapshotService } from './booking-snapshot.service';
@ApiTags('Seat reservations')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller()
export class BookingController {
  constructor(
    @Inject(SeatHoldsService) private readonly holds: SeatHoldsService,
    @Inject(HoldLifecycleService) private readonly lifecycle: HoldLifecycleService,
    @Inject(BookingSnapshotService) private readonly snapshots: BookingSnapshotService,
  ) {}
  @Post('events/:id/holds')
  @ApiBody({ type: CreateHoldDto })
  @Throttle({ default: { limit: 240, ttl: 60000 } })
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: CreateHoldDto,
  ) {
    return this.holds.create(id, p.user.id, input);
  }
  @Get('holds/:id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.holds.get(id, p.user.id);
  }
  @Delete('holds/:id') @HttpCode(200) release(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.lifecycle.release(id, p.user.id);
  }
  @Get('events/:id/booking-state') snapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.snapshots.get(id, p.user.id);
  }
}
