import { Global, Module } from '@nestjs/common';
import { InventoryPublisher } from '../booking/inventory-publisher';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeRedisAdapter } from './realtime-redis.adapter';
@Global()
@Module({
  providers: [
    RealtimeGateway,
    RealtimeRedisAdapter,
    { provide: InventoryPublisher, useExisting: RealtimeGateway },
  ],
  exports: [InventoryPublisher, RealtimeGateway],
})
export class RealtimeModule {}
