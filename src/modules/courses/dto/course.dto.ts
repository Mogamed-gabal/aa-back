import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

function transformBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class CourseStepDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stepOrder!: number;
  @ApiProperty() @IsString() @IsNotEmpty() captionAr!: string;
  @ApiProperty() @IsString() @IsNotEmpty() captionEn!: string;
}

export class CreateCourseDto {
  @ApiProperty() @IsString() @IsNotEmpty() titleAr!: string;
  @ApiProperty() @IsString() @IsNotEmpty() titleEn!: string;
  @ApiProperty() @IsString() @IsNotEmpty() descriptionAr!: string;
  @ApiProperty() @IsString() @IsNotEmpty() descriptionEn!: string;
  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsPositive()
  price!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  discountPrice?: number;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  onSale?: boolean;
  @ApiProperty() @IsString() @IsNotEmpty() duration!: string;
  @ApiProperty({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  videoCount!: number;
  @ApiProperty() @IsUrl({ require_protocol: true }) demoVideoUrl!: string;
  @ApiProperty() @IsUrl({ require_protocol: true }) driveFolderUrl!: string;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isPublished?: boolean;
  @ApiProperty({ type: [CourseStepDto] }) @IsString() stepsJson!: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() titleAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titleEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  price?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  discountPrice?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  onSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() duration?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  videoCount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  demoVideoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  driveFolderUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isPublished?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() stepsJson?: string;
}
