import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { admissionCredential, parseAdmissionCredential } from './waiting-credential';
import { WAITING_ROOM_SCRIPT } from './waiting-room.script';
const roomSchema = z.object({
  state: z.enum(['WAITING', 'ADMITTED', 'NOT_JOINED']),
  sid: z.uuid().optional(),
  nonce: z.string().optional(),
  expiresAt: z.number().optional(),
  admittedAt: z.number().optional(),
  serverTime: z.number(),
  position: z.number().optional(),
  queued: z.number(),
  active: z.number(),
});
@Injectable()
export class WaitingRoomService implements OnApplicationShutdown {
  readonly redis: Redis;
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {
    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 4000,
    });
    this.redis.on('error', () => {});
  }
  onApplicationShutdown() {
    this.redis.disconnect();
  }
  keys(id: string) {
    const p = `wr:{${id}}:`;
    return ['queue', 'active', 'sequence', 'meta', 'deadlines'].map((k) => p + k);
  }
  private async execute(
    eventId: string,
    userId: string,
    sid: string,
    nonce: string,
    capacity: number,
    op: string,
  ) {
    try {
      return await this.redis.eval(
        WAITING_ROOM_SCRIPT,
        5,
        ...this.keys(eventId),
        userId,
        sid,
        nonce,
        String(capacity),
        String(this.env.WAITING_ROOM_ADMISSION_SECONDS * 1000),
        String(this.env.WAITING_ROOM_QUEUE_SECONDS * 1000),
        op,
      );
    } catch {
      throw new ServiceUnavailableException('Hàng đợi tạm thời không khả dụng. Vui lòng thử lại.');
    }
  }
  private async event(id: string) {
    const e = await this.db.event.findFirst({
      where: { id, status: 'PUBLISHED', organization: { status: 'APPROVED' } },
      select: { id: true, waitingRoomEnabled: true, waitingRoomCapacity: true },
    });
    if (!e) throw new NotFoundException('Không tìm thấy sự kiện mở bán.');
    return e;
  }
  async status(eventId: string, userId: string, join = false) {
    const event = await this.event(eventId);
    eventId = event.id;
    if (!event.waitingRoomEnabled)
      return {
        eventId,
        state: 'DISABLED' as const,
        position: 0,
        peopleAhead: 0,
        queued: 0,
        active: 0,
        capacity: event.waitingRoomCapacity,
        expiresAt: null,
        serverTime: new Date().toISOString(),
        admissionToken: null,
      };
    let session = await this.db.waitingRoomSession.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!session && join)
      session = await this.db.waitingRoomSession.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: {},
        create: {
          eventId,
          userId,
          expiresAt: new Date(Date.now() + this.env.WAITING_ROOM_QUEUE_SECONDS * 1000),
        },
      });
    const sid = session?.id ?? '00000000-0000-4000-8000-000000000000';
    const raw = await this.execute(
      eventId,
      userId,
      sid,
      randomBytes(16).toString('hex'),
      event.waitingRoomCapacity,
      join ? 'join' : 'status',
    );
    const result = roomSchema.parse(JSON.parse(String(raw)));
    const admitted = result.state === 'ADMITTED';
    if (session && result.expiresAt)
      await this.db.waitingRoomSession.update({
        where: { id: session.id },
        data: {
          admittedAt: admitted ? new Date(result.admittedAt ?? result.serverTime) : null,
          expiresAt: new Date(result.expiresAt),
        },
      });
    return {
      eventId,
      state: result.state,
      position: result.position ?? 0,
      peopleAhead: Math.max(0, (result.position ?? 1) - 1),
      queued: result.queued,
      active: result.active,
      capacity: event.waitingRoomCapacity,
      expiresAt: result.expiresAt ? new Date(result.expiresAt).toISOString() : null,
      serverTime: new Date(result.serverTime).toISOString(),
      admissionToken:
        admitted && result.sid && result.nonce
          ? admissionCredential(result.sid, result.nonce, this.env.JWT_SECRET)
          : null,
    };
  }
  async leave(eventId: string, userId: string) {
    const event = await this.event(eventId);
    eventId = event.id;
    const session = await this.db.waitingRoomSession.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (session)
      await this.execute(eventId, userId, session.id, '', event.waitingRoomCapacity, 'leave');
    return { left: true };
  }
  async authorize(eventId: string, userId: string, token?: string): Promise<Date | null> {
    const event = await this.event(eventId);
    eventId = event.id;
    if (!event.waitingRoomEnabled) return null;
    const proof = token ? parseAdmissionCredential(token, this.env.JWT_SECRET) : null;
    if (!proof) throw new ForbiddenException('Bạn cần được cấp lượt từ phòng chờ.');
    const session = await this.db.waitingRoomSession.findUnique({ where: { id: proof.sessionId } });
    if (!session || session.eventId !== eventId || session.userId !== userId)
      throw new ForbiddenException('Quyền vào đặt vé không thuộc phiên này.');
    const raw = await this.execute(
      eventId,
      userId,
      session.id,
      proof.nonce,
      event.waitingRoomCapacity,
      'validate',
    );
    const result = z
      .object({ valid: z.boolean(), expiresAt: z.number().optional() })
      .parse(JSON.parse(String(raw)));
    if (!result.valid || !result.expiresAt)
      throw new ConflictException('Lượt vào đặt vé đã hết hạn. Vui lòng vào lại phòng chờ.');
    return new Date(result.expiresAt);
  }
}
