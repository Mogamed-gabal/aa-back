import { ConflictException, NotFoundException } from '@nestjs/common';
import { type Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Artwork } from './entities/artwork.entity';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let artworkRepository: { count: jest.Mock };

  beforeEach(() => {
    categoryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    artworkRepository = { count: jest.fn() };
    service = new CategoriesService(
      categoryRepository as unknown as Repository<Category>,
      artworkRepository as unknown as Repository<Artwork>,
    );
  });

  it('creates a category when its slug is unused', async () => {
    const category = Object.assign(new Category(), {
      id: 'category-id',
      nameAr: 'أصلية',
      nameEn: 'Original',
      slug: 'original',
    });
    categoryRepository.findOne.mockResolvedValue(null);
    categoryRepository.create.mockReturnValue(category);
    categoryRepository.save.mockResolvedValue(category);

    const result = await service.create({
      nameAr: 'أصلية',
      nameEn: 'Original',
      slug: 'original',
    });

    expect(categoryRepository.create).toHaveBeenCalled();
    expect(result).toBe(category);
  });

  it('rejects duplicate slugs', async () => {
    categoryRepository.findOne.mockResolvedValue(new Category());

    await expect(
      service.create({ nameAr: 'أصلية', nameEn: 'Original', slug: 'original' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects deleting a category containing artworks', async () => {
    categoryRepository.findOne.mockResolvedValue(new Category());
    artworkRepository.count.mockResolvedValue(1);

    await expect(service.remove('category-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(categoryRepository.remove).not.toHaveBeenCalled();
  });

  it('rejects deleting a missing category', async () => {
    categoryRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
