import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { SiteContent } from './entities/site-content.entity';

@Module({
  imports: [CloudinaryModule, TypeOrmModule.forFeature([SiteContent])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
