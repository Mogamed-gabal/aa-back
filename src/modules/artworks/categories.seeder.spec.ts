import { type Repository } from 'typeorm';
import { CategoriesSeeder } from './categories.seeder';
import { Category } from './entities/category.entity';

describe('CategoriesSeeder', () => {
  it('upserts the default categories on application bootstrap', async () => {
    const upsertMock = jest.fn().mockResolvedValue(undefined);
    const categoryRepository = {
      upsert: upsertMock,
    } as unknown as Repository<Category>;
    const seeder = new CategoriesSeeder(categoryRepository);

    await seeder.onApplicationBootstrap();

    expect(upsertMock).toHaveBeenCalledWith(
      [
        { nameAr: 'أصلية', nameEn: 'Original', slug: 'original' },
        {
          nameAr: 'إصدارات محدودة',
          nameEn: 'Limited Edition',
          slug: 'limited-edition',
        },
        { nameAr: 'كلاسيك', nameEn: 'Classic', slug: 'classic' },
        { nameAr: 'مطبوعات', nameEn: 'Printed', slug: 'printed' },
      ],
      ['slug'],
    );
  });
});
