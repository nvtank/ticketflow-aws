import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tixflow/shared';
import { Roles, CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { PageDto } from '../events/events.dto';
import { TicketsService } from './tickets.service';
@ApiTags('Tickets')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('tickets')
export class TicketsController {
  constructor(@Inject(TicketsService) private readonly tickets: TicketsService) {}
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ type: PageDto })
  list(@CurrentPrincipal() p: Principal, @Query() q: PageDto) {
    return this.tickets.list(p.user.id, q);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.tickets.get(id, p.user.id);
  }
}
