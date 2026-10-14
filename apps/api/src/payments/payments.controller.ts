import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@tixflow/shared';
import { CurrentPrincipal, Public, Roles } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { CreatePaymentDto, SimulatePaymentDto } from './payments.dto';
import { PaymentSessionsService } from './payment-sessions.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { PaymentsService } from './payments.service';
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(PaymentSessionsService) private readonly sessions: PaymentSessionsService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}
  @Get('config')
  @Public()
  config() {
    return {
      provider: this.env.PAYMENT_PROVIDER,
      available: this.env.PAYMENT_PROVIDER !== 'disabled',
    };
  }
  @Post('create')
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER)
  @ApiBody({ type: CreatePaymentDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(@CurrentPrincipal() p: Principal, @Body() input: CreatePaymentDto) {
    return this.sessions.create(input.orderId, input.idempotencyKey.toLowerCase(), p.user.id);
  }
  @Get(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER)
  status(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.payments.status(id, p.user.id);
  }
  @ApiBody({
    schema: {
      type: 'object',
      required: ['data', 'signature'],
      properties: {
        data: { type: 'object', additionalProperties: true },
        signature: { type: 'string' },
        code: { type: 'string' },
        desc: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @Post('webhook')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  webhook(@Body() raw: unknown) {
    return this.payments.webhook(raw);
  }
  @Post(':id/simulate')
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER)
  @HttpCode(200)
  @ApiBody({ type: SimulatePaymentDto })
  simulate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() input: SimulatePaymentDto,
  ) {
    return this.payments.simulate(id, p.user.id, input.outcome);
  }
}
