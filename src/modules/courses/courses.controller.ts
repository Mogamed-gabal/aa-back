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
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CoursesService } from './courses.service';

const IMAGE_VALIDATORS = [
  new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
  new FileTypeValidator({ fileType: /^(image\/jpeg|image\/png|image\/webp)$/ }),
];

@ApiTags('Courses')
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}
  @Get() findPublished() {
    return this.coursesService.findPublished();
  }
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  findAllAdmin() {
    return this.coursesService.findAllAdmin();
  }
  @Get(':id') findPublishedOne(@Param('id') id: string) {
    return this.coursesService.findPublishedOne(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FilesInterceptor('images', 21, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 21 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCourseDto })
  @ApiOperation({
    summary: 'Create a course with cover and ordered step images',
  })
  create(
    @Body() dto: CreateCourseDto,
    @UploadedFiles(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    files: Express.Multer.File[],
  ) {
    const [cover, ...steps] = files;
    return this.coursesService.create(dto, cover, steps);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FilesInterceptor('images', 21, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 21 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCourseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: IMAGE_VALIDATORS,
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    const [cover, ...steps] = files ?? [];
    return this.coursesService.update(
      id,
      dto,
      cover,
      dto.stepsJson === undefined ? [] : steps,
    );
  }
  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth('access-token') remove(
    @Param('id') id: string,
  ) {
    return this.coursesService.remove(id);
  }
}
