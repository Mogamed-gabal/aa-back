import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';
import { Artwork } from './entities/artwork.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Artwork)
    private readonly artworkRepository: Repository<Artwork>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { nameEn: 'ASC' },
    });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existingCategory !== null) {
      throw new ConflictException('A category with this slug already exists');
    }

    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (category === null) {
      throw new NotFoundException('Category not found');
    }

    const artworkCount = await this.artworkRepository.count({
      where: { category: { id } },
    });

    if (artworkCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that contains artworks',
      );
    }

    await this.categoryRepository.remove(category);
  }
}
