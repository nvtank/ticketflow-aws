import { Module } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
@Module({
  providers: [CheckInService],
  controllers: [CheckInController],
  exports: [CheckInService],
})
export class CheckInModule {}
