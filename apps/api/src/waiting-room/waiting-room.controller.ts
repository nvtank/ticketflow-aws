import { Controller, Post, Get, Delete, Param, ParseUUIDPipe, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@tixflow/shared';
import { Roles, CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { WaitingRoomService } from './waiting-room.service';
@ApiTags('Waiting room')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Throttle({ default: { limit: 240, ttl: 60000 } })
@Controller('events/:id/waiting-room')
export class WaitingRoomController {
  constructor(@Inject(WaitingRoomService) private readonly room: WaitingRoomService) {}
  @Post('join') join(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.room.status(id, p.user.id, true);
  }
  @Get() status(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.room.status(id, p.user.id);
  }
  @Delete() leave(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.room.leave(id, p.user.id);
  }
}
