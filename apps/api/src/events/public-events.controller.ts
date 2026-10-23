import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import { PublicEventsService } from './public-events.service';
import { EventQueryDto } from './events.dto';
@ApiTags('Public events')
@Public()
@Controller('events')
export class PublicEventsController {
  constructor(@Inject(PublicEventsService) private readonly events: PublicEventsService) {}
  @ApiQuery({ type: EventQueryDto })
  @Get()
  @ApiOperation({
    summary: 'List published upcoming events; price filters apply to the lowest ticket price',
  })
  list(@Query() query: EventQueryDto) {
    return this.events.list(query);
  }
  @Get(':key/seats') seats(@Param('key') key: string) {
    return this.events.seats(key);
  }
  @Get(':key/inventory') inventory(@Param('key') key: string) {
    return this.events.inventory(key);
  }
  @Get(':key') detail(@Param('key') key: string) {
    return this.events.detail(key);
  }
}
