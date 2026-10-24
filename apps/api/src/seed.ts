import { credentialHash, ticketCredential } from './tickets/ticket-credential';
import { seedDiscovery } from './discovery/seed-discovery';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from './generated/prisma/client';

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;

async function seed(): Promise<void> {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development'))
    throw new Error('Seed is restricted to development/test.');
  const url = process.env.DATABASE_URL;
  const password = process.env.DEMO_PASSWORD;
  if (!url || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Set DATABASE_URL and a valid DEMO_PASSWORD in root .env.');
  const signingKey =
    process.env.TICKET_SIGNING_KEY ??
    (process.env.JWT_SECRET
      ? createHmac('sha256', process.env.JWT_SECRET).update('tixflow-ticket-key-v1').digest('hex')
      : null);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) });
  try {
    const passwordHash = await hash(password, 12);
    const now = new Date();
    const future = (offset: number) => new Date(now.getTime() + offset * 86_400_000);
    await prisma.$transaction(
      async (tx) => {
        const users = [
          {
            id: id(1),
            email: 'admin@tixflow.local',
            name: 'Quản trị TixFlow',
            role: 'ADMIN' as const,
          },
          {
            id: id(2),
            email: 'organizer@tixflow.local',
            name: 'Nhà tổ chức TixFlow',
            role: 'ORGANIZER' as const,
          },
          {
            id: id(3),
            email: 'staff@tixflow.local',
            name: 'Nhân viên soát vé',
            role: 'STAFF' as const,
          },
          {
            id: id(4),
            email: 'customer@tixflow.local',
            name: 'Nguyễn Minh Anh',
            role: 'CUSTOMER' as const,
          },
          {
            id: id(5),
            email: 'customer2@tixflow.local',
            name: 'Trần Hoàng Nam',
            role: 'CUSTOMER' as const,
          },
        ];
        for (const user of users) {
          const existing = await tx.user.findUnique({ where: { email: user.email } });
          if (existing && existing.id !== user.id)
            throw new Error('A demo email is already used outside the seed dataset.');
          await tx.user.upsert({
            where: { id: user.id },
            update: {},
            create: { ...user, passwordHash },
          });
        }
        const organization = await tx.organization.upsert({
          where: { id: id(10) },
          update: {},
          create: { id: id(10), name: 'TixFlow Live', slug: 'tixflow-live', status: 'APPROVED' },
        });
        await tx.organizationMember.upsert({
          where: { organizationId_userId: { organizationId: organization.id, userId: id(2) } },
          update: {},
          create: { organizationId: organization.id, userId: id(2) },
        });
        const configs = [
          {
            n: 1,
            title: `TixFlow Music Festival ${future(30).getFullYear()}`,
            slug: 'tixflow-music-festival',
            city: 'Đà Nẵng',
            venue: 'Cung thể thao Tiên Sơn',
            category: 'MUSIC',
            offset: 30,
            rows: 10,
            columns: 20,
            vipRows: 2,
          },
          {
            n: 2,
            title: 'Tech Innovation Summit',
            slug: 'tech-innovation-summit',
            city: 'TP. Hồ Chí Minh',
            venue: 'Trung tâm Hội nghị Sài Gòn',
            category: 'CONFERENCE',
            offset: 45,
            rows: 4,
            columns: 10,
            vipRows: 0,
          },
          {
            n: 3,
            title: 'Summer Live Concert',
            slug: 'summer-live-concert',
            city: 'Hà Nội',
            venue: 'Nhà hát Hà Nội',
            category: 'MUSIC',
            offset: 60,
            rows: 6,
            columns: 10,
            vipRows: 0,
          },
        ];
        for (const config of configs) {
          const venue = await tx.venue.upsert({
            where: { id: id(100 + config.n) },
            update: {},
            create: {
              id: id(100 + config.n),
              name: config.venue,
              city: config.city,
              address: `Địa điểm demo tại ${config.city}`,
            },
          });
          const event = await tx.event.upsert({
            where: { id: id(200 + config.n) },
            update: {},
            create: {
              id: id(200 + config.n),
              organizationId: organization.id,
              venueId: venue.id,
              title: config.title,
              slug: config.slug,
              category: config.category,
              status: 'PUBLISHED',
              description: 'Sự kiện demo local dành cho phát triển và kiểm thử TixFlow.',
              startsAt: future(config.offset),
              endsAt: new Date(future(config.offset).getTime() + 3 * 3_600_000),
              salesStartAt: new Date(now.getTime() - 86_400_000),
              salesEndAt: future(config.offset - 1),
              ticketPolicy: 'Dữ liệu demo local. Chưa hỗ trợ thanh toán hoặc hoàn tiền thật.',
            },
          });
          const standard = await tx.ticketType.upsert({
            where: { id: id(300 + config.n) },
            update: {},
            create: {
              id: id(300 + config.n),
              eventId: event.id,
              name: 'Standard',
              priceVnd: 499_000,
            },
          });
          const standardSection = await tx.eventSection.upsert({
            where: { id: id(400 + config.n) },
            update: {},
            create: {
              id: id(400 + config.n),
              eventId: event.id,
              ticketTypeId: standard.id,
              name: 'Standard',
              rowCount: config.rows - config.vipRows,
              columnCount: config.columns,
            },
          });
          let vipSectionId = standardSection.id;
          if (config.vipRows) {
            const vip = await tx.ticketType.upsert({
              where: { id: id(500 + config.n) },
              update: {},
              create: {
                id: id(500 + config.n),
                eventId: event.id,
                name: 'VIP',
                priceVnd: 1_200_000,
              },
            });
            const section = await tx.eventSection.upsert({
              where: { id: id(600 + config.n) },
              update: {},
              create: {
                id: id(600 + config.n),
                eventId: event.id,
                ticketTypeId: vip.id,
                name: 'VIP',
                rowCount: config.vipRows,
                columnCount: config.columns,
              },
            });
            vipSectionId = section.id;
          }
          await tx.seat.createMany({
            skipDuplicates: true,
            data: Array.from({ length: config.rows * config.columns }, (_, index) => {
              const row = Math.floor(index / config.columns);
              const rowLabel = String.fromCharCode(65 + row);
              const columnNumber = (index % config.columns) + 1;
              return {
                eventId: event.id,
                sectionId: row < config.vipRows ? vipSectionId : standardSection.id,
                rowLabel,
                columnNumber,
                code: `${rowLabel}${String(columnNumber).padStart(2, '0')}`,
              };
            }),
          });
        }
        await tx.eventStaffAssignment.upsert({
          where: { eventId_userId: { eventId: id(201), userId: id(3) } },
          update: {},
          create: { eventId: id(201), userId: id(3) },
        });
        if (!(await tx.order.findUnique({ where: { id: id(700) } }))) {
          const requested = await tx.seat.findMany({
            where: { eventId: id(201), code: { in: ['A01', 'A02'] } },
            select: { id: true },
            orderBy: { id: 'asc' },
          });
          const hold = await tx.seatHold.create({
            data: {
              id: id(701),
              requestedSeatIds: requested.map((seat) => seat.id),
              userId: id(4),
              eventId: id(201),
              expiresAt: new Date(now.getTime() - 300_000),
            },
          });
          const order = await tx.order.create({
            data: {
              id: id(700),
              userId: id(4),
              eventId: id(201),
              holdId: hold.id,
              idempotencyKey: 'seed-paid-order',
              status: 'PAID',
              totalVnd: 2_400_000,
              expiresAt: hold.expiresAt,
              paidAt: now,
            },
          });
          for (const [index, code] of ['A01', 'A02'].entries()) {
            const seat = await tx.seat.update({
              where: { eventId_code: { eventId: id(201), code } },
              data: { status: 'SOLD', holdId: null },
            });
            const item = await tx.orderItem.create({
              data: { orderId: order.id, eventId: id(201), seatId: seat.id, priceVnd: 1_200_000 },
            });
            const ticketId = randomUUID();
            const ticket = await tx.ticket.create({
              data: {
                id: ticketId,
                orderItemId: item.id,
                eventId: id(201),
                seatId: seat.id,
                code: `TF-DEMO-${index + 1}`,
                qrVersion: signingKey ? 1 : 0,
                qrTokenHash: signingKey
                  ? credentialHash(ticketCredential(ticketId, signingKey))
                  : createHash('sha256').update(randomBytes(32)).digest('hex'),
                status: index === 0 ? 'VALID' : 'USED',
              },
            });
            if (index === 1)
              await tx.checkIn.create({ data: { ticketId: ticket.id, staffId: id(3) } });
          }
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: 'SEED_ONLY',
              providerReference: 'seed-payment-1',
              status: 'SUCCEEDED',
              amountVnd: order.totalVnd,
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: id(1),
              action: 'DEMO_DATA_SEEDED',
              entityType: 'Order',
              entityId: order.id,
            },
          });
        }
        if (signingKey) {
          const legacy = await tx.ticket.findMany({
            where: {
              code: { in: ['TF-DEMO-1', 'TF-DEMO-2'] },
              qrVersion: 0,
              orderItem: { orderId: id(700) },
            },
          });
          for (const ticket of legacy)
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                qrVersion: 1,
                qrTokenHash: credentialHash(ticketCredential(ticket.id, signingKey)),
              },
            });
        }
      },
      { timeout: 60_000 },
    );
    await seedDiscovery(prisma);
    console.log(
      'Seed completed: 5 users, 1 organization, 3 events, 300 seats, 1 paid order, 2 tickets. Existing demo passwords and sold inventory preserved.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch(() => {
  console.error(
    'Seed failed. Check database, migrations and local seed configuration. No credentials printed.',
  );
  process.exitCode = 1;
});
