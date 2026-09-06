import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UpdateAboutDto {
  @ApiProperty({ example: 'About the Artist' })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiProperty({ example: 'About the Artist' })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiProperty({
    example: 'A visual artist inspired by memory, light, and human connection.',
  })
  @IsString()
  @IsNotEmpty()
  bioAr!: string;

  @ApiProperty({
    example: 'A visual artist inspired by memory, light, and human connection.',
  })
  @IsString()
  @IsNotEmpty()
  bioEn!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/about-1.webp',
  })
  @IsUrl()
  image1Url!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/about-2.webp',
  })
  @IsUrl()
  image2Url!: string;
}
