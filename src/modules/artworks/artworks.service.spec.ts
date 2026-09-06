import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Repository } from 'typeorm';
import {
  CloudinaryService,
  type CloudinaryUploadResult,
} from '../../shared/cloudinary/cloudinary.service';
import { ArtworksService } from './artworks.service';
import { ArtworkImage } from './entities/artwork-image.entity';
import { Artwork, ArtworkStatus } from './entities/artwork.entity';
import { Category } from './entities/category.entity';

function createCategory(): Category {
  return Object.assign(new Category(), {
    id: 'category-id',
    nameAr: 'أصلية',
    nameEn: 'Original',
    slug: 'original',
  });
}

function createArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return Object.assign(new Artwork(), {
    id: 'artwork-id',
    titleAr: 'لوحة عربية',
    titleEn: 'English Artwork',
    storyAr: 'قصة اللوحة بالعربية الطويلة.',
    storyEn: 'A sufficiently long artwork story in English.',
    price: '2500.00',
    discountPrice: null,
    onSale: false,
    quantity: 1,
    isBestSeller: false,
    status: ArtworkStatus.AVAILABLE,
    category: createCategory(),
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('ArtworksService', () => {
  let service: ArtworksService;
  let artworkRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let categoryRepository: { findOne: jest.Mock };
  let imageRepository: { create: jest.Mock; delete: jest.Mock };
  let cloudinaryService: { uploadImage: jest.Mock };

  beforeEach(() => {
    artworkRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    categoryRepository = { findOne: jest.fn() };
    imageRepository = { create: jest.fn(), delete: jest.fn() };
    cloudinaryService = { uploadImage: jest.fn() };
    service = new ArtworksService(
      artworkRepository as unknown as Repository<Artwork>,
      categoryRepository as unknown as Repository<Category>,
      imageRepository as unknown as Repository<ArtworkImage>,
      cloudinaryService as unknown as CloudinaryService,
    );
  });

  it('creates an artwork and marks zero quantity as sold out', async () => {
    const category = createCategory();
    const artwork = createArtwork({
      quantity: 0,
      status: ArtworkStatus.SOLD_OUT,
    });
    const image = Object.assign(new ArtworkImage(), {
      id: 'image-id',
      url: 'https://res.cloudinary.com/demo/image.webp',
      publicId: 'art-gallery/artwork/image',
      isPrimary: true,
      artwork,
    });
    const uploadResult: CloudinaryUploadResult = {
      secureUrl: image.url,
      publicId: image.publicId,
    };
    categoryRepository.findOne.mockResolvedValue(category);
    artworkRepository.create.mockReturnValue(artwork);
    artworkRepository.save
      .mockResolvedValueOnce(artwork)
      .mockResolvedValueOnce(artwork);
    cloudinaryService.uploadImage.mockResolvedValue(uploadResult);
    imageRepository.create.mockReturnValue(image);

    const result = await service.create(
      {
        titleAr: 'لوحة عربية',
        titleEn: 'English Artwork',
        storyAr: 'قصة اللوحة بالعربية الطويلة.',
        storyEn: 'A sufficiently long artwork story in English.',
        price: 2500,
        quantity: 0,
        categoryId: category.id,
      },
      [{ buffer: Buffer.from('image') } as Express.Multer.File],
    );

    expect(artwork.status).toBe(ArtworkStatus.SOLD_OUT);
    expect(artwork.quantity).toBe(0);
    expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(1);
    expect(result).toBe(artwork);
  });

  it('updates quantity and changes sold out back to available', async () => {
    const artwork = createArtwork({
      quantity: 0,
      status: ArtworkStatus.SOLD_OUT,
    });
    artworkRepository.findOne.mockResolvedValue(artwork);
    artworkRepository.save.mockResolvedValue(artwork);

    const result = await service.update(artwork.id, { quantity: 3 }, []);

    expect(artwork.quantity).toBe(3);
    expect(artwork.status).toBe(ArtworkStatus.AVAILABLE);
    expect(result).toBe(artwork);
  });

  it('rejects an invalid discount configuration', async () => {
    const category = createCategory();
    categoryRepository.findOne.mockResolvedValue(category);

    await expect(
      service.create(
        {
          titleAr: 'لوحة عربية',
          titleEn: 'English Artwork',
          storyAr: 'قصة اللوحة بالعربية الطويلة.',
          storyEn: 'A sufficiently long artwork story in English.',
          price: 2500,
          discountPrice: 2500,
          onSale: true,
          categoryId: category.id,
        },
        [{ buffer: Buffer.from('image') } as Express.Multer.File],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(artworkRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an artwork without images', async () => {
    await expect(
      service.create(
        {
          titleAr: 'لوحة عربية',
          titleEn: 'English Artwork',
          storyAr: 'قصة اللوحة بالعربية الطويلة.',
          storyEn: 'A sufficiently long artwork story in English.',
          price: 2500,
          categoryId: 'category-id',
        },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(categoryRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws when the requested artwork does not exist', async () => {
    artworkRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
