import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PageDto } from '../events/events.dto';
export class UserQueryDto extends PageDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN']) role?:
    'CUSTOMER' | 'ORGANIZER' | 'STAFF' | 'ADMIN';
}
export class AccountAccessDto {
  @IsBoolean() isActive!: boolean;
  @IsString() @Length(10, 500) reason!: string;
}
export class OrganizationQueryDto extends PageDto {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status?:
    'PENDING' | 'APPROVED' | 'REJECTED';
}
export class OrganizationReviewDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  @IsString() @Length(10, 500) reason!: string;
}
