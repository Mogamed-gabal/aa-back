import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { ArtworksController } from './artworks.controller';
import { ArtworksService } from './artworks.service';
import { CategoriesController } from './categories.controller';
import { CategoriesSeeder } from './categories.seeder';
import { CategoriesService } from './categories.service';
import { ArtworkImage } from './entities/artwork-image.entity';
import { Artwork } from './entities/artwork.entity';
import { Category } from './entities/category.entity';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    TypeOrmModule.forFeature([Category, Artwork, ArtworkImage]),
  ],
  controllers: [ArtworksController, CategoriesController],
  providers: [ArtworksService, CategoriesService, CategoriesSeeder],
  exports: [ArtworksService, CategoriesService],
})
export class ArtworksModule {}
