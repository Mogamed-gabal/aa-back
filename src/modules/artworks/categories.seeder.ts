import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

const DEFAULT_CATEGORIES: ReadonlyArray<
  Pick<Category, 'nameAr' | 'nameEn' | 'slug'>
> = [
  { nameAr: 'أصلية', nameEn: 'Original', slug: 'original' },
  {
    nameAr: 'إصدارات محدودة',
    nameEn: 'Limited Edition',
    slug: 'limited-edition',
  },
  { nameAr: 'كلاسيك', nameEn: 'Classic', slug: 'classic' },
  { nameAr: 'مطبوعات', nameEn: 'Printed', slug: 'printed' },
];

@Injectable()
export class CategoriesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CategoriesSeeder.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.categoryRepository.upsert([...DEFAULT_CATEGORIES], ['slug']);
    this.logger.log('Default artwork categories are ready');
  }
}
