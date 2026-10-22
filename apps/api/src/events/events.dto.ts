import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EVENT_CATEGORIES } from '@tixflow/shared';

export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 12;
}
export class EventQueryDto extends PageDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn(EVENT_CATEGORIES) category?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @IsOptional() @IsISO8601({ strict: true }) to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) maxPrice?: number;
  @IsOptional() @IsIn(['date', 'price_asc', 'price_desc']) sort:
    'date' | 'price_asc' | 'price_desc' = 'date';
}
export class OrganizerQueryDto extends PageDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'])
  status?: string;
}
export class VenueDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;
  @IsString() @MinLength(3) @MaxLength(500) address!: string;
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
}
export class EventFieldsDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;
  @IsString() @MinLength(20) @MaxLength(20000) description!: string;
  @IsIn(EVENT_CATEGORIES) category!: string;
  @IsDefined() @ValidateNested() @Type(() => VenueDto) venue!: VenueDto;
  @IsISO8601({ strict: true }) startsAt!: string;
  @IsISO8601({ strict: true }) endsAt!: string;
  @IsISO8601({ strict: true }) salesStartAt!: string;
  @IsISO8601({ strict: true }) salesEndAt!: string;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  coverUrl?: string | null;
  @IsArray()
  @ArrayMaxSize(8)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    { each: true },
  )
  galleryUrls: string[] = [];
  @IsString() @MinLength(10) @MaxLength(5000) ticketPolicy!: string;
  @IsInt() @Min(1) @Max(10) maxTicketsPerOrder = 4;
}
export class CreateEventDto extends EventFieldsDto {
  @IsUUID() organizationId!: string;
}
export class SectionDto {
  @IsString() @MinLength(1) @MaxLength(60) name!: string;
  @IsString() @MinLength(1) @MaxLength(60) ticketName!: string;
  @IsInt() @Min(0) @Max(100000000) priceVnd!: number;
  @IsInt() @Min(1) @Max(26) rows!: number;
  @IsInt() @Min(1) @Max(40) columns!: number;
}
export class GridDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}
export class SeatEnabledDto {
  @IsBoolean() enabled!: boolean;
}
export class RejectEventDto {
  @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
}
export class AssignStaffDto {
  @IsString() @MinLength(5) @MaxLength(254) email!: string;
}
