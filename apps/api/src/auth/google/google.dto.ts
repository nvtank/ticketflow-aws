import { IsString, MinLength, MaxLength } from 'class-validator';
export class GoogleCredentialDto {
  @IsString() @MinLength(20) @MaxLength(8192) credential!: string;
}
