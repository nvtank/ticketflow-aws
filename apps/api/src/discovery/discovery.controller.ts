import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentPrincipal, Public } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { ArtistQueryDto, ReviewQueryDto, SaveReviewDto } from './discovery.dto';
import { DiscoveryService } from './discovery.service';

@ApiTags('Discovery and community')
@Controller()
export class DiscoveryController {
  constructor(@Inject(DiscoveryService) private readonly discovery: DiscoveryService) {}
  @Public()
  @Get('artists')
  @ApiQuery({ type: ArtistQueryDto })
  artists(@Query() q: ArtistQueryDto) {
    return this.discovery.artists(q);
  }
  @Public()
  @Get('artists/:slug')
  artist(@Param('slug') slug: string) {
    return this.discovery.artist(slug);
  }
  @Public()
  @Get('reviews')
  @ApiQuery({ type: ReviewQueryDto })
  reviews(@Query() q: ReviewQueryDto) {
    return this.discovery.reviews(q);
  }
  @ApiBearerAuth()
  @Get('events/:eventId/review-context')
  context(@Param('eventId', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.discovery.context(id, p.user.id);
  }
  @ApiBearerAuth()
  @Put('events/:eventId/review')
  @ApiBody({ type: SaveReviewDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create or update your booking review; requires a paid valid ticket' })
  save(
    @Param('eventId', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
    @Body() body: SaveReviewDto,
  ) {
    return this.discovery.save(id, p.user.id, body);
  }
  @ApiBearerAuth()
  @Delete('reviews/:id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentPrincipal() p: Principal) {
    return this.discovery.remove(id, p.user.id);
  }
}
