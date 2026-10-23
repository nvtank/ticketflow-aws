import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
export class AnalyticsQueryDto {
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsUUID('4') eventId?: string;
  @IsOptional() @IsUUID('4') organizationId?: string;
}
