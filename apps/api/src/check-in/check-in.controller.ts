import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { AdmissionDto } from './check-in.dto';
import { CheckInService } from './check-in.service';
@ApiTags('Staff check-in')
@ApiBearerAuth()
@Roles(UserRole.STAFF)
@Controller('check-in')
export class CheckInController {
  constructor(@Inject(CheckInService) private readonly service: CheckInService) {}
  @Get('events') events(@CurrentPrincipal() p: Principal) {
    return this.service.events(p.user.id);
  }
  @Get('events/:id/stats') stats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.service.stats(id, p.user.id);
  }
  @Post('verify')
  @ApiBody({ type: AdmissionDto })
  @Throttle({ default: { limit: 240, ttl: 60000 } })
  verify(@CurrentPrincipal() p: Principal, @Body() input: AdmissionDto) {
    return this.service.verify(p.user.id, input);
  }
  @Post('confirm')
  @ApiBody({ type: AdmissionDto })
  @Throttle({ default: { limit: 240, ttl: 60000 } })
  confirm(@CurrentPrincipal() p: Principal, @Body() input: AdmissionDto) {
    return this.service.confirm(p.user.id, input);
  }
}
