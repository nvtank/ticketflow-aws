import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
export class CreatePaymentDto {
  @ApiProperty() @IsUUID('4') orderId!: string;
  @ApiProperty() @IsUUID('4') idempotencyKey!: string;
}
export class SimulatePaymentDto {
  @ApiProperty({ enum: ['success', 'failed', 'cancelled', 'delayed', 'duplicate'] })
  @IsIn(['success', 'failed', 'cancelled', 'delayed', 'duplicate'])
  outcome!: 'success' | 'failed' | 'cancelled' | 'delayed' | 'duplicate';
}
