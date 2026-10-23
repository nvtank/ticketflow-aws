import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AnalyticsReport } from '@tixflow/shared';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { databaseNow } from '../booking/booking-record';
import { reportNumber, reportRange } from './reporting-policy';
import type { AnalyticsQueryDto } from './analytics.dto';
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async organizer(userId: string, q: AnalyticsQueryDto): Promise<AnalyticsReport> {
    return this.db.$transaction(
      async (tx) => {
        const member = { members: { some: { userId } } };
        if (
          q.organizationId &&
          !(await tx.organization.count({ where: { id: q.organizationId, ...member } }))
        )
          throw new ForbiddenException('Bạn không có quyền xem tổ chức này.');
        if (
          q.eventId &&
          !(await tx.event.count({
            where: {
              id: q.eventId,
              organization: member,
              ...(q.organizationId ? { organizationId: q.organizationId } : {}),
            },
          }))
        )
          throw new ForbiddenException('Bạn không có quyền xem báo cáo sự kiện này.');
        const eventWhere = {
          organization: member,
          ...(q.eventId ? { id: q.eventId } : {}),
          ...(q.organizationId ? { organizationId: q.organizationId } : {}),
        };
        const now = await databaseNow(tx),
          range = reportRange(q.from, q.to, now);
        const period = {
          event: eventWhere,
          status: 'PAID' as const,
          paidAt: { gte: range.start, lt: range.end },
        };
        const totalEvents = await tx.event.count({ where: eventWhere });
        const orders = await tx.order.aggregate({
          where: period,
          _count: { id: true },
          _sum: { totalVnd: true },
        });
        const soldTickets = await tx.ticket.count({ where: { orderItem: { order: period } } });
        const capacity = await tx.seat.count({
          where: { event: eventWhere, status: { not: 'UNAVAILABLE' } },
        });
        const soldSeats = await tx.seat.count({ where: { event: eventWhere, status: 'SOLD' } });
        const availableSeats = await tx.seat.count({
          where: {
            event: eventWhere,
            OR: [
              { status: 'AVAILABLE' },
              {
                status: 'HELD',
                hold: { OR: [{ expiresAt: { lte: now } }, { releasedAt: { not: null } }] },
              },
            ],
          },
        });
        const heldSeats = capacity - soldSeats - availableSeats;
        const checkIns = await tx.checkIn.count({
          where: { ticket: { seat: { event: eventWhere } } },
        });
        const scope = Prisma.sql`EXISTS(SELECT 1 FROM "OrganizationMember" m WHERE m."organizationId"=e."organizationId" AND m."userId"=${userId}::uuid) AND (${q.eventId ?? null}::uuid IS NULL OR e.id=${q.eventId ?? null}::uuid) AND (${q.organizationId ?? null}::uuid IS NULL OR e."organizationId"=${q.organizationId ?? null}::uuid)`;
        const daily = await tx.$queryRaw<{ date: string; revenue: bigint; orders: number }[]>(
          Prisma.sql`SELECT to_char(o."paidAt" AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,SUM(o."totalVnd")::bigint AS revenue,COUNT(*)::int AS orders FROM "Order" o JOIN "Event" e ON e.id=o."eventId" WHERE ${scope} AND o.status='PAID' AND o."paidAt">=${range.start} AND o."paidAt"<${range.end} GROUP BY 1 ORDER BY 1`,
        );
        const rows = await tx.$queryRaw<
          {
            eventId: string;
            eventTitle: string;
            section: string;
            sold: number;
            available: number;
            checkedIn: number;
          }[]
        >(
          Prisma.sql`SELECT e.id AS "eventId",e.title AS "eventTitle",sec.name AS section,COUNT(*) FILTER(WHERE s.status='SOLD')::int AS sold,COUNT(*) FILTER(WHERE s.status='AVAILABLE' OR (s.status='HELD' AND (h."expiresAt"<=${now} OR h."releasedAt" IS NOT NULL)))::int AS available,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM "Ticket" t JOIN "CheckIn" c ON c."ticketId"=t.id WHERE t."seatId"=s.id))::int AS "checkedIn" FROM "Seat" s JOIN "Event" e ON e.id=s."eventId" JOIN "EventSection" sec ON sec.id=s."sectionId" LEFT JOIN "SeatHold" h ON h.id=s."holdId" WHERE ${scope} GROUP BY e.id,e.title,sec.id,sec.name ORDER BY e.title,sec.name LIMIT 100`,
        );
        const recent = await tx.order.findMany({
          where: { event: eventWhere },
          include: { event: { select: { title: true } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 10,
        });
        const byDate = new Map(daily.map((d) => [d.date, d]));
        const revenueByDay = [];
        for (
          let date = Date.parse(range.from + 'T00:00:00Z');
          date < Date.parse(range.to + 'T00:00:00Z') + 86400000;
          date += 86400000
        ) {
          const day = new Date(date).toISOString().slice(0, 10),
            d = byDate.get(day);
          revenueByDay.push({
            date: day,
            revenueVnd: reportNumber(d?.revenue ?? 0),
            orders: d?.orders ?? 0,
          });
        }
        return {
          from: range.from,
          to: range.to,
          timezone: 'Asia/Ho_Chi_Minh',
          totalEvents,
          paidOrders: orders._count.id,
          revenueVnd: reportNumber(orders._sum.totalVnd),
          soldTickets,
          availableSeats,
          heldSeats,
          soldSeats,
          capacity,
          occupancy: capacity ? soldSeats / capacity : 0,
          checkIns,
          revenueByDay,
          sections: rows,
          recentOrders: recent.map((o) => ({
            id: o.id,
            eventTitle: o.event.title,
            totalVnd: o.totalVnd,
            createdAt: o.createdAt.toISOString(),
            status: o.status,
          })),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 15000 },
    );
  }
}
