import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  environmentId: number;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  moduleIds: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  assignments?: Record<string, string>;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  environmentId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  moduleIds?: string[];

  @IsOptional()
  @IsObject()
  assignments?: Record<string, string>;
}
