import { Inject, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { SkipThrottle } from '@nestjs/throttler';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import type {
  InventoryEventName,
  InventoryUpdate,
  RealtimeClientEvents,
  RealtimeServerEvents,
  EventRoomAck,
  OrderStatus,
} from '@tixflow/shared';
import { Public } from '../auth/auth.decorators';
import { AuthProvider } from '../auth/auth-provider';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { RealtimeRedisAdapter } from './realtime-redis.adapter';
interface SocketData {
  userId: string;
  joinedAt?: number;
}
type EventSocket = Socket<
  RealtimeClientEvents,
  RealtimeServerEvents,
  Record<string, never>,
  SocketData
>;
type EventServer = Server<
  RealtimeClientEvents,
  RealtimeServerEvents,
  Record<string, never>,
  SocketData
>;
@Public()
@SkipThrottle()
@WebSocketGateway({ transports: ['websocket'], maxHttpBufferSize: 8192, serveClient: false })
export class RealtimeGateway
  extends InventoryPublisher
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationBootstrap,
    OnApplicationShutdown
{
  @WebSocketServer() server!: EventServer;
  private readonly connections = new Set<string>();
  private readonly logger = new Logger(RealtimeGateway.name);
  constructor(
    @Inject(AuthProvider) private readonly auth: AuthProvider,
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(RealtimeRedisAdapter) private readonly redis: RealtimeRedisAdapter,
  ) {
    super();
  }
  afterInit(server: EventServer) {
    server.engine.opts.allowRequest = (request, callback) => {
      const origin = request.headers.origin;
      callback(null, !origin || this.env.CORS_ORIGINS.includes(origin));
    };
    server.use((socket, next) => {
      void (async () => {
        const input = z
          .object({ token: z.string().min(1).max(4096) })
          .safeParse(socket.handshake.auth);
        if (!input.success) throw new Error('UNAUTHENTICATED');
        const principal = await this.auth.authenticate(input.data.token);
        socket.data.userId = principal.user.id;
        next();
      })().catch(() => {
        const error = new Error('Phiên đăng nhập không hợp lệ.') as Error & {
          data: { code: string };
        };
        error.data = { code: 'UNAUTHENTICATED' };
        next(error);
      });
    });
  }
  async onApplicationBootstrap() {
    if (this.env.SOCKET_REDIS_ADAPTER) await this.redis.attach(this.server);
  }
  async handleConnection(socket: EventSocket) {
    this.connections.add(socket.id);
    await socket.join(`user:${socket.data.userId}`);
  }
  handleDisconnect(socket: EventSocket) {
    this.connections.delete(socket.id);
  }
  @SubscribeMessage('event:join')
  async join(
    @ConnectedSocket() socket: EventSocket,
    @MessageBody() raw: unknown,
  ): Promise<EventRoomAck> {
    const parsed = z.object({ eventId: z.uuid() }).strict().safeParse(raw);
    if (!parsed.success) return { ok: false, message: 'Mã sự kiện không hợp lệ.' };
    if (socket.data.joinedAt && Date.now() - socket.data.joinedAt < 300)
      return { ok: false, message: 'Vui lòng chờ trước khi thử lại.' };
    socket.data.joinedAt = Date.now();
    try {
      await this.auth.authenticate(String(socket.handshake.auth.token ?? ''));
      const event = await this.db.event.findFirst({
        where: {
          id: parsed.data.eventId,
          status: 'PUBLISHED',
          organization: { status: 'APPROVED' },
        },
        select: { id: true, inventoryRevision: true },
      });
      if (!event) return { ok: false, message: 'Sự kiện không khả dụng.' };
      for (const room of socket.rooms) if (room.startsWith('event:')) await socket.leave(room);
      await socket.join(`event:${event.id}`);
      return { ok: true, eventId: event.id, revision: event.inventoryRevision };
    } catch {
      return { ok: false, message: 'Không thể xác minh quyền truy cập.' };
    }
  }
  override publish(name: InventoryEventName, update: InventoryUpdate) {
    try {
      if (!this.server) return;
      this.server.to(`event:${update.eventId}`).emit(name, update);
      this.server.to(`event:${update.eventId}`).emit('inventory:updated', update);
    } catch {
      this.logger.warn(
        'Inventory commit succeeded; realtime delivery failed. REST resync is required.',
      );
    }
  }
  override orderChanged(
    userId: string,
    input: { orderId: string; eventId: string; status: OrderStatus },
  ) {
    try {
      this.server?.to(`user:${userId}`).emit('order:updated', input);
    } catch {
      this.logger.warn('Order commit succeeded; realtime delivery failed.');
    }
  }
  snapshot() {
    return {
      socketConnections: this.connections.size,
      redisAdapterEnabled: this.env.SOCKET_REDIS_ADAPTER,
    };
  }
  onApplicationShutdown() {
    this.server?.disconnectSockets(true);
  }
}
