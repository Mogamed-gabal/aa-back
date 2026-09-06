import { type Repository } from 'typeorm';
import { type CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import { Course } from './entities/course.entity';
import { CourseStep } from './entities/course-step.entity';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: { find: jest.Mock; findOne: jest.Mock };
  let stepRepository: { create: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    courseRepository = { find: jest.fn(), findOne: jest.fn() };
    stepRepository = { create: jest.fn(), delete: jest.fn() };
    service = new CoursesService(
      courseRepository as unknown as Repository<Course>,
      stepRepository as unknown as Repository<CourseStep>,
      {} as CloudinaryService,
    );
  });

  it('removes driveFolderUrl from public course responses', async () => {
    courseRepository.find.mockResolvedValue([
      {
        id: 'course-id',
        titleEn: 'Course',
        driveFolderUrl: 'https://drive.google.com/private',
        steps: [],
      },
    ]);
    const result = await service.findPublished();
    expect(result[0]).not.toHaveProperty('driveFolderUrl');
    expect(result[0]).toMatchObject({ id: 'course-id', titleEn: 'Course' });
  });

  it('does not expose unpublished courses publicly', async () => {
    courseRepository.findOne.mockResolvedValue(null);
    await expect(service.findPublishedOne('hidden-id')).rejects.toThrow(
      'Published course not found',
    );
  });
});
