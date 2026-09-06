import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UpdateHeroDto {
  @ApiProperty({ example: 'Original Art, Lasting Emotion' })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiProperty({ example: 'Original Art, Lasting Emotion' })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiProperty({ example: 'Discover a world painted with feeling.' })
  @IsString()
  @IsNotEmpty()
  subtitleAr!: string;

  @ApiProperty({ example: 'Discover a world painted with feeling.' })
  @IsString()
  @IsNotEmpty()
  subtitleEn!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/hero.webp',
  })
  @IsUrl()
  imageUrl!: string;
}
