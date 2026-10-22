import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  Inject,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import { CurrentPrincipal } from '../auth/auth.decorators';
import type { Principal } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
class InboxQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
@ApiBearerAuth()
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  @Get('me') @ApiQuery({ type: InboxQueryDto }) list(
    @CurrentPrincipal() p: Principal,
    @Query() q: InboxQueryDto,
  ) {
    return this.db.$transaction(
      async (tx) => {
        const where = { userId: p.user.id };
        const total = await tx.notification.count({ where });
        const unread = await tx.notification.count({ where: { ...where, readAt: null } });
        const items = await tx.notification.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          select: { id: true, title: true, message: true, readAt: true, createdAt: true },
        });
        return {
          items,
          unread,
          pagination: {
            page: q.page,
            pageSize: q.pageSize,
            total,
            totalPages: Math.ceil(total / q.pageSize),
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Patch(':id/read') async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() p: Principal,
  ) {
    const n = await this.db.notification.findFirst({ where: { id, userId: p.user.id } });
    if (!n) throw new NotFoundException('Không tìm thấy thông báo.');
    await this.db.notification.updateMany({
      where: { id, userId: p.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true };
  }
}
@Module({ controllers: [NotificationsController] })
export class NotificationsModule {}
