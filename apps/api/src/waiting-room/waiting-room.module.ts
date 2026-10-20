import { Global, Module } from '@nestjs/common';
import { WaitingRoomService } from './waiting-room.service';
import { WaitingRoomController } from './waiting-room.controller';
@Global()
@Module({
  providers: [WaitingRoomService],
  controllers: [WaitingRoomController],
  exports: [WaitingRoomService],
})
export class WaitingRoomModule {}
