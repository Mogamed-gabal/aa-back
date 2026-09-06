import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import {
  CourseStepDto,
  CreateCourseDto,
  UpdateCourseDto,
} from './dto/course.dto';
import { Course } from './entities/course.entity';
import { CourseStep } from './entities/course-step.entity';

export type PublicCourse = Omit<Course, 'driveFolderUrl'>;

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseStep)
    private readonly stepRepository: Repository<CourseStep>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findPublished(): Promise<PublicCourse[]> {
    const courses = await this.courseRepository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
    return courses.map((course) => this.toPublic(course));
  }

  async findPublishedOne(id: string): Promise<PublicCourse> {
    const course = await this.courseRepository.findOne({
      where: { id, isPublished: true },
    });
    if (!course) throw new NotFoundException('Published course not found');
    return this.toPublic(course);
  }

  async findAllAdmin(): Promise<Course[]> {
    return this.courseRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(
    dto: CreateCourseDto,
    cover: Express.Multer.File,
    stepImages: Express.Multer.File[],
  ): Promise<Course> {
    if (!cover) throw new BadRequestException('Course cover image is required');
    const steps = this.parseSteps(dto.stepsJson);
    if (steps.length !== stepImages.length)
      throw new BadRequestException(
        'One image is required for each course step',
      );
    this.validatePricing(dto.price, dto.discountPrice, dto.onSale ?? false);
    const coverUpload = await this.cloudinary.uploadImage(cover);
    const uploadedSteps = await Promise.all(
      stepImages.map((file) => this.cloudinary.uploadImage(file)),
    );
    const course = this.courseRepository.create({
      titleAr: dto.titleAr,
      titleEn: dto.titleEn,
      descriptionAr: dto.descriptionAr,
      descriptionEn: dto.descriptionEn,
      price: this.money(dto.price),
      discountPrice:
        dto.onSale && dto.discountPrice !== undefined
          ? this.money(dto.discountPrice)
          : null,
      onSale: dto.onSale ?? false,
      duration: dto.duration,
      videoCount: dto.videoCount,
      demoVideoUrl: dto.demoVideoUrl,
      driveFolderUrl: dto.driveFolderUrl,
      coverImageUrl: coverUpload.secureUrl,
      isPublished: dto.isPublished ?? true,
      steps: steps.map((step, index) =>
        this.stepRepository.create({
          ...step,
          imageUrl: uploadedSteps[index].secureUrl,
        }),
      ),
    });
    return this.courseRepository.save(course);
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    cover: Express.Multer.File | undefined,
    stepImages: Express.Multer.File[],
  ): Promise<Course> {
    const course = await this.findAdminOne(id);
    const nextPrice = dto.price ?? Number(course.price);
    const nextOnSale = dto.onSale ?? course.onSale;
    const nextDiscount =
      dto.discountPrice ??
      (course.discountPrice ? Number(course.discountPrice) : undefined);
    this.validatePricing(nextPrice, nextDiscount, nextOnSale);
    if (dto.titleAr !== undefined) course.titleAr = dto.titleAr;
    if (dto.titleEn !== undefined) course.titleEn = dto.titleEn;
    if (dto.descriptionAr !== undefined)
      course.descriptionAr = dto.descriptionAr;
    if (dto.descriptionEn !== undefined)
      course.descriptionEn = dto.descriptionEn;
    if (dto.price !== undefined) course.price = this.money(dto.price);
    if (dto.discountPrice !== undefined || dto.onSale !== undefined)
      course.discountPrice =
        nextOnSale && nextDiscount !== undefined
          ? this.money(nextDiscount)
          : null;
    if (dto.onSale !== undefined) course.onSale = dto.onSale;
    if (dto.duration !== undefined) course.duration = dto.duration;
    if (dto.videoCount !== undefined) course.videoCount = dto.videoCount;
    if (dto.demoVideoUrl !== undefined) course.demoVideoUrl = dto.demoVideoUrl;
    if (dto.driveFolderUrl !== undefined)
      course.driveFolderUrl = dto.driveFolderUrl;
    if (dto.isPublished !== undefined) course.isPublished = dto.isPublished;
    if (cover)
      course.coverImageUrl = (
        await this.cloudinary.uploadImage(cover)
      ).secureUrl;
    if (dto.stepsJson !== undefined) {
      const steps = this.parseSteps(dto.stepsJson);
      if (steps.length !== stepImages.length)
        throw new BadRequestException(
          'One image is required for each replaced course step',
        );
      await this.stepRepository.delete({ course: { id } });
      const uploads = await Promise.all(
        stepImages.map((file) => this.cloudinary.uploadImage(file)),
      );
      course.steps = steps.map((step, index) =>
        this.stepRepository.create({
          ...step,
          imageUrl: uploads[index].secureUrl,
        }),
      );
    }
    return this.courseRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    await this.courseRepository.remove(await this.findAdminOne(id));
  }

  private async findAdminOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }
  private parseSteps(value: string): CourseStepDto[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('stepsJson must be valid JSON');
    }
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new BadRequestException('At least one course step is required');
    return parsed
      .map((step: unknown) => {
        if (
          !step ||
          typeof step !== 'object' ||
          typeof (step as CourseStepDto).stepOrder !== 'number' ||
          typeof (step as CourseStepDto).captionAr !== 'string' ||
          typeof (step as CourseStepDto).captionEn !== 'string'
        )
          throw new BadRequestException('Invalid course step');
        return step as CourseStepDto;
      })
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }
  private toPublic(course: Course): PublicCourse {
    const publicCourse = { ...course } as Partial<Course>;
    Reflect.deleteProperty(publicCourse, 'driveFolderUrl');
    return publicCourse as PublicCourse;
  }
  private money(value: number): string {
    return value.toFixed(2);
  }
  private validatePricing(
    price: number,
    discount: number | undefined,
    onSale: boolean,
  ): void {
    if (onSale && (discount === undefined || discount >= price))
      throw new BadRequestException(
        'Discount price must be lower than the original price when on sale',
      );
  }
}
