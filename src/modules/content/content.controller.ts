import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { type CloudinaryUploadResult } from '../../shared/cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContentService, type SiteInfoResponse } from './content.service';
import { type SiteContent } from './entities/site-content.entity';

@ApiTags('Content')
@Controller({ path: 'content', version: '1' })
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a content image to Cloudinary' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(image\/jpeg|image\/png|image\/webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResult> {
    return this.contentService.uploadImage(file);
  }

  @Put(':sectionKey')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'sectionKey',
    enum: ['hero', 'about', 'contact'],
  })
  @ApiOperation({ summary: 'Create or update a content section' })
  @ApiResponse({ status: 200, description: 'Content section saved.' })
  async updateSection(
    @Param('sectionKey') sectionKey: string,
    @Body() body: Record<string, unknown>,
  ): Promise<SiteContent> {
    return this.contentService.updateSection(sectionKey, body);
  }

  @Get('site-info')
  @ApiOperation({ summary: 'Get all public website content sections' })
  @ApiResponse({ status: 200, description: 'Website content returned.' })
  async getSiteInfo(): Promise<SiteInfoResponse> {
    return this.contentService.getSiteInfo();
  }
}
