import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

export const eventInclude = {
  organization: { select: { id: true, name: true, status: true } },
  venue: true,
  sections: {
    orderBy: { name: 'asc' },
    include: {
      ticketType: true,
      seats: { select: { status: true, hold: { select: { expiresAt: true, releasedAt: true } } } },
    },
  },
} satisfies Prisma.EventInclude;
export type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>;
export const isAvailable = (
  seat: EventRecord['sections'][number]['seats'][number],
  now = new Date(),
) =>
  seat.status === 'AVAILABLE' ||
  (seat.status === 'HELD' &&
    !!seat.hold &&
    (seat.hold.expiresAt <= now || seat.hold.releasedAt !== null));
export function eventView(event: EventRecord) {
  const now = new Date();
  const sections = event.sections.map((section) => ({
    id: section.id,
    name: section.name,
    rowCount: section.rowCount,
    columnCount: section.columnCount,
    ticketType: section.ticketType,
    totalSeats: section.seats.length,
    availableSeats: section.seats.filter((s) => isAvailable(s, now)).length,
    soldSeats: section.seats.filter((s) => s.status === 'SOLD').length,
  }));
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    category: event.category,
    status: event.status,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    salesStartAt: event.salesStartAt,
    salesEndAt: event.salesEndAt,
    coverUrl: event.coverUrl,
    galleryUrls: event.galleryUrls,
    ticketPolicy: event.ticketPolicy,
    maxTicketsPerOrder: event.maxTicketsPerOrder,
    waitingRoomEnabled: event.waitingRoomEnabled,
    waitingRoomCapacity: event.waitingRoomCapacity,
    inventoryRevision: event.inventoryRevision,
    rejectionReason: event.rejectionReason,
    organization: { id: event.organization.id, name: event.organization.name },
    venue: event.venue,
    city: event.venue.city,
    venueName: event.venue.name,
    minPriceVnd: sections.length ? Math.min(...sections.map((s) => s.ticketType.priceVnd)) : 0,
    availableSeats: sections.reduce((sum, s) => sum + s.availableSeats, 0),
    sections,
  };
}
export async function lockEvent(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Event" WHERE "id" = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new NotFoundException('Không tìm thấy sự kiện.');
  return tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude });
}
export async function requireMember(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
  approved = true,
) {
  const member = await tx.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { organization: true },
  });
  if (!member || (approved && member.organization.status !== 'APPROVED'))
    throw new ForbiddenException('Bạn không có quyền quản lý tổ chức đã được duyệt này.');
}
export async function auditEvent(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string,
  action: string,
  metadata?: Prisma.InputJsonObject,
) {
  await tx.auditLog.create({
    data: { actorId, action, entityType: 'Event', entityId: id, ...(metadata ? { metadata } : {}) },
  });
}
export const pagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});
