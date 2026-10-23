import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export class CreateHoldDto {
  @IsOptional() @IsString() @MaxLength(256) admissionToken?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  seatIds!: string[];
  @IsUUID('4') idempotencyKey!: string;
}
export class CreateOrderDto {
  @IsUUID('4') holdId!: string;
  @IsUUID('4') idempotencyKey!: string;
}
