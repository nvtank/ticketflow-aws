import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@tixflow/shared';
import { Roles, CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { CreateOrderDto } from '../booking/booking.dto';
import { PageDto } from '../events/events.dto';
import { OrdersService } from './orders.service';
@ApiTags('Orders')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}
  @Post()
  @ApiBody({ type: CreateOrderDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(@CurrentPrincipal() p: Principal, @Body() input: CreateOrderDto) {
    return this.orders.create(p.user.id, input);
  }
  @Get('me') @ApiQuery({ type: PageDto }) list(
    @CurrentPrincipal() p: Principal,
    @Query() q: PageDto,
  ) {
    return this.orders.list(p.user.id, q);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.orders.get(id, p.user.id);
  }
  @Delete(':id') @HttpCode(200) cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    return this.orders.cancel(id, p.user.id);
  }
}
