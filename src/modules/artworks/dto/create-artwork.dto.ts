import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

function transformBoolean(value: unknown): unknown {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

export class CreateArtworkDto {
  @ApiProperty({ example: 'لوحة غروب' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  titleAr!: string;

  @ApiProperty({ example: 'Sunset Painting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  titleEn!: string;

  @ApiProperty({ example: 'قصة اللوحة وتفاصيل الإلهام خلفها.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  storyAr!: string;

  @ApiProperty({ example: 'The story and inspiration behind the artwork.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  storyEn!: string;

  @ApiProperty({ example: 2500, minimum: 0.01 })
  @Type(() => Number)
  @IsPositive()
  price!: number;

  @ApiPropertyOptional({ example: 2000, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  discountPrice?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  quantity?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description:
      'Zero-based index of the primary image in the uploaded images list.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  primaryImageIndex?: number;
}
