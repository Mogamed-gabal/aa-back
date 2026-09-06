import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtworkQueryDto } from './dto/artwork-query.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { ArtworksService } from './artworks.service';
import { Artwork } from './entities/artwork.entity';

const IMAGE_VALIDATORS = [
  new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
  new FileTypeValidator({
    fileType: /^(image\/jpeg|image\/png|image\/webp)$/,
  }),
];

@ApiTags('Artworks')
@Controller({ path: 'artworks', version: '1' })
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Get('home-featured')
  @ApiOperation({ summary: 'Get six random featured artworks' })
  @ApiResponse({ status: 200, description: 'Featured artworks returned.' })
  async getHomeFeatured(): Promise<Artwork[]> {
    return this.artworksService.getHomeFeatured();
  }

  @Get()
  @ApiOperation({ summary: 'List artworks with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated artworks returned.' })
  async findAll(@Query() query: ArtworkQueryDto) {
    return this.artworksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get artwork details' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Artwork details returned.' })
  async findOne(@Param('id') id: string): Promise<Artwork> {
    return this.artworksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateArtworkDto })
  @ApiOperation({ summary: 'Create an artwork with uploaded images' })
  @ApiResponse({ status: 201, description: 'Artwork created.' })
  async create(
    @Body() dto: CreateArtworkDto,
    @UploadedFiles(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    uploadedFiles: Express.Multer.File[],
  ): Promise<Artwork> {
    return this.artworksService.create(dto, uploadedFiles);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateArtworkDto })
  @ApiOperation({ summary: 'Update an artwork and optionally replace images' })
  @ApiResponse({ status: 200, description: 'Artwork updated.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArtworkDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: IMAGE_VALIDATORS,
        fileIsRequired: false,
      }),
    )
    uploadedFiles?: Express.Multer.File[],
  ): Promise<Artwork> {
    return this.artworksService.update(id, dto, uploadedFiles ?? []);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Delete an artwork' })
  @ApiResponse({ status: 204, description: 'Artwork deleted.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.artworksService.remove(id);
  }
}
