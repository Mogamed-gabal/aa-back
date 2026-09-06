import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateContactDto {
  @ApiProperty({ example: 'Get in Touch' })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiProperty({ example: 'Get in Touch' })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiProperty({ example: 'For inquiries, commissions, and collaborations.' })
  @IsString()
  @IsNotEmpty()
  descriptionAr!: string;

  @ApiProperty({ example: 'For inquiries, commissions, and collaborations.' })
  @IsString()
  @IsNotEmpty()
  descriptionEn!: string;

  @ApiProperty({ example: '+201000000000' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'https://wa.me/201000000000' })
  @IsString()
  @IsNotEmpty()
  whatsapp!: string;

  @ApiProperty({ example: 'artist@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: {
      instagram: 'https://instagram.com/artist',
      facebook: 'https://facebook.com/artist',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}
