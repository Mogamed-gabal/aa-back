import { BadRequestException } from '@nestjs/common';
import { type Repository } from 'typeorm';
import {
  CloudinaryService,
  type CloudinaryUploadResult,
} from '../../shared/cloudinary/cloudinary.service';
import { ContentService } from './content.service';
import {
  SiteContent,
  type ContentSectionKey,
} from './entities/site-content.entity';

function createSiteContent(
  sectionKey: ContentSectionKey,
  data: Record<string, unknown>,
): SiteContent {
  return Object.assign(new SiteContent(), {
    id: `${sectionKey}-content-id`,
    sectionKey,
    data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ContentService', () => {
  let contentService: ContentService;
  let contentRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let cloudinaryService: {
    uploadImage: jest.Mock;
  };

  beforeEach(() => {
    contentRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    cloudinaryService = {
      uploadImage: jest.fn(),
    };
    contentService = new ContentService(
      contentRepository as unknown as Repository<SiteContent>,
      cloudinaryService as unknown as CloudinaryService,
    );
  });

  it('updates an existing section', async () => {
    const existingSection = createSiteContent('hero', {});
    const updatedSection = createSiteContent('hero', {
      titleAr: 'عنوان عربي',
      titleEn: 'English title',
      subtitleAr: 'وصف عربي',
      subtitleEn: 'English subtitle',
      imageUrl: 'https://example.com/hero.webp',
    });
    contentRepository.findOne.mockResolvedValue(existingSection);
    contentRepository.save.mockResolvedValue(updatedSection);

    const result = await contentService.updateSection('hero', {
      titleAr: 'عنوان عربي',
      titleEn: 'English title',
      subtitleAr: 'وصف عربي',
      subtitleEn: 'English subtitle',
      imageUrl: 'https://example.com/hero.webp',
    });

    expect(existingSection.data).toEqual(updatedSection.data);
    expect(contentRepository.save).toHaveBeenCalledWith(existingSection);
    expect(result).toBe(updatedSection);
  });

  it('creates a missing section', async () => {
    const createdSection = createSiteContent('about', {
      titleAr: 'عن الفنان',
      titleEn: 'About the artist',
      bioAr: 'السيرة بالعربية',
      bioEn: 'Biography in English',
      image1Url: 'https://example.com/about-1.webp',
      image2Url: 'https://example.com/about-2.webp',
    });
    contentRepository.findOne.mockResolvedValue(null);
    contentRepository.create.mockReturnValue(createdSection);
    contentRepository.save.mockResolvedValue(createdSection);

    const result = await contentService.updateSection('about', {
      titleAr: 'عن الفنان',
      titleEn: 'About the artist',
      bioAr: 'السيرة بالعربية',
      bioEn: 'Biography in English',
      image1Url: 'https://example.com/about-1.webp',
      image2Url: 'https://example.com/about-2.webp',
    });

    expect(contentRepository.create).toHaveBeenCalledWith({
      sectionKey: 'about',
      data: createdSection.data,
    });
    expect(result).toBe(createdSection);
  });

  it('rejects an unsupported section key', async () => {
    await expect(
      contentService.updateSection('footer', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(contentRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects invalid section data', async () => {
    await expect(
      contentService.updateSection('hero', {
        titleAr: 'Only one field',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(contentRepository.findOne).not.toHaveBeenCalled();
  });

  it('returns all content sections in one response', async () => {
    contentRepository.find.mockResolvedValue([
      createSiteContent('hero', { titleEn: 'Hero' }),
      createSiteContent('contact', { email: 'artist@example.com' }),
    ]);

    const result = await contentService.getSiteInfo();

    expect(result).toEqual({
      hero: { titleEn: 'Hero' },
      about: null,
      contact: { email: 'artist@example.com' },
    });
  });

  it('delegates image uploads to CloudinaryService', async () => {
    const uploadResult: CloudinaryUploadResult = {
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/image.webp',
      publicId: 'art-gallery/content/image',
    };
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;
    cloudinaryService.uploadImage.mockResolvedValue(uploadResult);

    const result = await contentService.uploadImage(file);

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file);
    expect(result).toEqual(uploadResult);
  });
});
