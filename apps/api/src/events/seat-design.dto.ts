import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { SeatBlock, SeatDesign, SeatStage, SeatZone } from '@tixflow/shared';
class ZoneDto implements SeatZone {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,64}$/) id!: string;
  @IsString() @MinLength(1) @MaxLength(60) name!: string;
  @IsInt() @Min(0) @Max(100000000) priceVnd!: number;
  @Matches(/^#[a-f0-9]{6}$/i) color!: string;
}
class BlockDto implements SeatBlock {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,64}$/) id!: string;
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,64}$/) zoneId!: string;
  @IsInt() @Min(0) @Max(6000) x!: number;
  @IsInt() @Min(0) @Max(6000) y!: number;
  @IsInt() @Min(-180) @Max(180) rotation!: number;
  @IsInt() @Min(1) @Max(26) rows!: number;
  @IsInt() @Min(1) @Max(40) columns!: number;
  @IsArray()
  @ArrayMaxSize(1040)
  @IsInt({ each: true })
  @Min(0, { each: true })
  disabledSeats!: number[];
}
class StageDto implements SeatStage {
  @IsInt() @Min(0) @Max(6000) x!: number;
  @IsInt() @Min(0) @Max(6000) y!: number;
  @IsInt() @Min(80) @Max(2000) width!: number;
  @IsInt() @Min(60) @Max(1000) height!: number;
}
export class SeatDesignDto implements SeatDesign {
  @IsIn([1]) version!: 1;
  @IsInt() @Min(800) @Max(6000) width!: number;
  @IsInt() @Min(600) @Max(6000) height!: number;
  @IsDefined() @ValidateNested() @Type(() => StageDto) stage!: StageDto;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ZoneDto)
  zones!: ZoneDto[];
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks!: BlockDto[];
  @IsInt() @Min(0) expectedRevision!: number;
}
