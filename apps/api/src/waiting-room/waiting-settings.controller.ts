import {
  Body,
  Controller,
  Patch,
  Param,
  ParseUUIDPipe,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { lockEvent, requireMember, auditEvent, eventView } from '../events/event-record';
export class WaitingSettingsDto {
  @IsBoolean() enabled!: boolean;
  @IsInt() @Min(1) @Max(500) capacity!: number;
}
@ApiBearerAuth()
@ApiTags('Waiting room settings')
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@Controller('events/:id/waiting-room/settings')
export class WaitingSettingsController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  @Patch() @ApiBody({ type: WaitingSettingsDto }) update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: WaitingSettingsDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      if (p.user.role !== UserRole.ADMIN) await requireMember(tx, event.organizationId, p.user.id);
      if (['CANCELLED', 'COMPLETED'].includes(event.status))
        throw new ConflictException('Sự kiện đã kết thúc.');
      await tx.event.update({
        where: { id },
        data: { waitingRoomEnabled: input.enabled, waitingRoomCapacity: input.capacity },
      });
      await auditEvent(tx, id, p.user.id, 'WAITING_ROOM_CONFIGURED', {
        enabled: input.enabled,
        capacity: input.capacity,
      });
      return eventView({
        ...event,
        waitingRoomEnabled: input.enabled,
        waitingRoomCapacity: input.capacity,
      });
    });
  }
}
