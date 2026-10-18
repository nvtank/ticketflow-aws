import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import { MetricsService } from '../common/http/metrics.service';
import { BookingMetrics } from '../booking/booking-metrics';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { reportNumber } from '../analytics/reporting-policy';
import { pagination } from '../events/event-record';
import type {
  AccountAccessDto,
  UserQueryDto,
  OrganizationQueryDto,
  OrganizationReviewDto,
} from './admin.dto';
const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
@Injectable()
export class AdminService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(BookingMetrics) private readonly bookings: BookingMetrics,
    @Inject(RealtimeGateway) private readonly realtime: RealtimeGateway,
    @Inject(InventoryPublisher) private readonly publisher: InventoryPublisher,
  ) {}
  async dashboard() {
    return this.db.$transaction(
      async (tx) => {
        const users = await tx.user.count(),
          organizations = await tx.organization.count(),
          events = await tx.event.count(),
          pendingEvents = await tx.event.count({ where: { status: 'PENDING_APPROVAL' } }),
          pendingOrganizations = await tx.organization.count({ where: { status: 'PENDING' } });
        const paid = await tx.order.aggregate({
          where: { status: 'PAID' },
          _sum: { totalVnd: true },
          _count: { id: true },
        });
        const tickets = await tx.ticket.count({ where: { status: { in: ['VALID', 'USED'] } } }),
          checkIns = await tx.checkIn.count(),
          refundRequired = await tx.payment.count({ where: { status: 'REFUND_REQUIRED' } });
        return {
          users,
          organizations,
          events,
          pendingEvents,
          pendingOrganizations,
          revenueVnd: reportNumber(paid._sum.totalVnd),
          paidOrders: paid._count.id,
          tickets,
          checkIns,
          refundRequired,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async monitoring() {
    const rows = await this.db.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "Seat" s JOIN "SeatHold" h ON h.id=s."holdId" WHERE s.status='HELD' AND h."releasedAt" IS NULL AND h."expiresAt">clock_timestamp()`;
    return {
      ...this.metrics.snapshot(),
      ...this.bookings.snapshot(),
      ...this.realtime.snapshot(),
      validHeldSeats: rows[0]!.count,
      queue: null,
    };
  }
  async users(q: UserQueryDto) {
    const where = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' as const } },
              { name: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: q.pageSize,
        skip: (q.page - 1) * q.pageSize,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, pagination: pagination(q.page, q.pageSize, total) };
  }
  async user(id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    return user;
  }
  async access(id: string, actorId: string, input: AccountAccessDto) {
    const user = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id}::uuid FOR UPDATE`;
      const target = await tx.user.findUnique({ where: { id }, select: userSelect });
      if (!target) throw new NotFoundException('Không tìm thấy tài khoản.');
      if (target.role === 'ADMIN' || id === actorId)
        throw new ConflictException(
          'Không thể khóa hoặc thay đổi quyền truy cập tài khoản ADMIN tại đây.',
        );
      const result = await tx.user.update({
        where: { id },
        data: { isActive: input.isActive },
        select: userSelect,
      });
      if (!input.isActive)
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await tx.auditLog.create({
        data: {
          actorId,
          action: input.isActive ? 'ACCOUNT_UNLOCKED' : 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: id,
          metadata: { reason: input.reason },
        },
      });
      return result;
    });
    if (!input.isActive) this.publisher.disconnectUser(id);
    return user;
  }
  async organizations(q: OrganizationQueryDto) {
    const where = q.status ? { status: q.status } : {};
    const [items, total] = await this.db.$transaction([
      this.db.organization.findMany({
        where,
        include: { _count: { select: { members: true, events: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: q.pageSize,
        skip: (q.page - 1) * q.pageSize,
      }),
      this.db.organization.count({ where }),
    ]);
    return { items, pagination: pagination(q.page, q.pageSize, total) };
  }
  async review(id: string, actorId: string, input: OrganizationReviewDto) {
    return this.db.$transaction(async (tx) => {
      const updated = await tx.organization.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: input.decision,
          rejectionReason: input.decision === 'REJECTED' ? input.reason : null,
        },
      });
      if (!updated.count) throw new ConflictException('Tổ chức không còn ở trạng thái chờ duyệt.');
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ORGANIZATION_' + input.decision,
          entityType: 'Organization',
          entityId: id,
          metadata: { reason: input.reason },
        },
      });
      return tx.organization.findUniqueOrThrow({ where: { id } });
    });
  }
  async organizationHistory(id: string) {
    return this.db.auditLog.findMany({
      where: { entityType: 'Organization', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, createdAt: true, metadata: true },
    });
  }
}
