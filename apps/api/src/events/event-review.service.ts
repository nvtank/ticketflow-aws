import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { PageDto } from './events.dto';
import { assertEditable, validateDates } from './event-policy';
import {
  auditEvent,
  eventInclude,
  eventView,
  lockEvent,
  pagination,
  requireMember,
} from './event-record';

@Injectable()
export class EventReviewService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  private ready(event: Awaited<ReturnType<typeof lockEvent>>) {
    validateDates({
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      salesStartAt: event.salesStartAt.toISOString(),
      salesEndAt: event.salesEndAt.toISOString(),
    });
    if (
      event.organization.status !== 'APPROVED' ||
      event.salesEndAt <= new Date() ||
      !event.sections.some((s) => s.seats.some((seat) => seat.status !== 'UNAVAILABLE'))
    )
      throw new BadRequestException(
        'Cần tổ chức đã duyệt, thời gian bán vé còn hiệu lực và ít nhất một ghế sử dụng.',
      );
  }
  async submit(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      await requireMember(tx, event.organizationId, userId);
      assertEditable(event.status);
      this.ready(event);
      const updated = await tx.event.update({
        where: { id },
        data: { status: 'PENDING_APPROVAL', rejectionReason: null },
        include: eventInclude,
      });
      await auditEvent(tx, id, userId, 'EVENT_SUBMITTED');
      return eventView(updated);
    });
  }
  async decide(id: string, actorId: string, approved: boolean, reason?: string) {
    if (!approved && (!reason || reason.trim().length < 5))
      throw new BadRequestException('Lý do từ chối cần ít nhất 5 ký tự.');
    return this.db.$transaction(async (tx) => {
      const event = await lockEvent(tx, id);
      if (event.status !== 'PENDING_APPROVAL')
        throw new ConflictException(
          'Sự kiện không còn chờ duyệt. Tải lại để xem trạng thái mới nhất.',
        );
      if (approved) this.ready(event);
      const updated = await tx.event.update({
        where: { id },
        data: {
          status: approved ? 'PUBLISHED' : 'REJECTED',
          rejectionReason: approved ? null : reason!.trim(),
        },
        include: eventInclude,
      });
      await auditEvent(
        tx,
        id,
        actorId,
        approved ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
        approved ? undefined : { reason: reason!.trim() },
      );
      return eventView(updated);
    });
  }
  async pending(query: PageDto) {
    const where = { status: 'PENDING_APPROVAL' as const };
    const [items, total] = await this.db.$transaction([
      this.db.event.findMany({
        where,
        include: eventInclude,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.event.count({ where }),
    ]);
    return {
      items: items.map(eventView),
      pagination: pagination(query.page, query.pageSize, total),
    };
  }
  async detail(id: string) {
    const event = await this.db.event.findUnique({ where: { id }, include: eventInclude });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện.');
    return eventView(event);
  }
  async history(id: string, userId?: string) {
    const event = await this.db.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện.');
    if (userId) await requireMember(this.db, event.organizationId, userId, false);
    return this.db.auditLog.findMany({
      where: { entityType: 'Event', entityId: id, action: { startsWith: 'EVENT_' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    });
  }
}
