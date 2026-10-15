import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';
export class AdmissionDto {
  @ApiProperty() @IsUUID('4') eventId!: string;
  @ApiProperty({ description: 'Signed QR credential or random ticket code' })
  @IsString()
  @Length(1, 256)
  credential!: string;
}
