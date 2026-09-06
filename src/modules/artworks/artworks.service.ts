import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  CloudinaryService,
  type CloudinaryUploadResult,
} from '../../shared/cloudinary/cloudinary.service';
import { ArtworkQueryDto } from './dto/artwork-query.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { ArtworkImage } from './entities/artwork-image.entity';
import { Artwork, ArtworkStatus } from './entities/artwork.entity';
import { Category } from './entities/category.entity';

export interface PaginatedArtworks {
  readonly items: Artwork[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

@Injectable()
export class ArtworksService {
  constructor(
    @InjectRepository(Artwork)
    private readonly artworkRepository: Repository<Artwork>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ArtworkImage)
    private readonly imageRepository: Repository<ArtworkImage>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query: ArtworkQueryDto): Promise<PaginatedArtworks> {
    const page = query.page;
    const limit = query.limit;
    const queryBuilder = this.createPublicQueryBuilder();

    if (query.categoryId !== undefined) {
      queryBuilder.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.slug !== undefined) {
      queryBuilder.andWhere('category.slug = :slug', { slug: query.slug });
    }

    if (query.isBestSeller !== undefined) {
      queryBuilder.andWhere('artwork.is_best_seller = :isBestSeller', {
        isBestSeller: query.isBestSeller,
      });
    }

    if (query.onSale !== undefined) {
      queryBuilder.andWhere('artwork.on_sale = :onSale', {
        onSale: query.onSale,
      });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      queryBuilder.andWhere(
        '(artwork.title_ar ILIKE :search OR artwork.title_en ILIKE :search OR artwork.story_ar ILIKE :search OR artwork.story_en ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('artwork.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getHomeFeatured(): Promise<Artwork[]> {
    const artworks = await this.createPublicQueryBuilder()
      .orderBy('RANDOM()')
      .getMany();
    const artworksByCategory = new Map<string, Artwork[]>();

    for (const artwork of artworks) {
      const categoryArtworks =
        artworksByCategory.get(artwork.category.id) ?? [];
      categoryArtworks.push(artwork);
      artworksByCategory.set(artwork.category.id, categoryArtworks);
    }

    const categoryGroups = [...artworksByCategory.values()].map((group) =>
      this.shuffle(group),
    );
    const featured: Artwork[] = [];
    let groupIndex = 0;

    while (featured.length < 6 && categoryGroups.length > 0) {
      const group = categoryGroups[groupIndex % categoryGroups.length];
      const artwork = group.shift();

      if (artwork !== undefined) {
        featured.push(artwork);
      }

      if (group.length === 0) {
        categoryGroups.splice(groupIndex % categoryGroups.length, 1);
      } else {
        groupIndex += 1;
      }
    }

    return featured;
  }

  async findOne(id: string): Promise<Artwork> {
    const artwork = await this.artworkRepository.findOne({
      where: { id },
      relations: { category: true, images: true },
    });

    if (artwork === null) {
      throw new NotFoundException('Artwork not found');
    }

    return artwork;
  }

  async create(
    dto: CreateArtworkDto,
    files: Express.Multer.File[],
  ): Promise<Artwork> {
    if (files.length === 0) {
      throw new BadRequestException('At least one artwork image is required');
    }

    const category = await this.findCategory(dto.categoryId);
    const onSale = dto.onSale ?? false;
    const quantity = dto.quantity ?? 1;
    this.validatePricing(dto.price, dto.discountPrice, onSale);
    this.validatePrimaryImageIndex(dto.primaryImageIndex, files.length);

    const artwork = this.artworkRepository.create({
      titleAr: dto.titleAr,
      titleEn: dto.titleEn,
      storyAr: dto.storyAr,
      storyEn: dto.storyEn,
      price: this.toMoney(dto.price),
      discountPrice:
        onSale && dto.discountPrice !== undefined
          ? this.toMoney(dto.discountPrice)
          : null,
      onSale,
      quantity,
      isBestSeller: dto.isBestSeller ?? false,
      status: this.getStatus(quantity),
      category,
      images: [],
    });

    const savedArtwork = await this.artworkRepository.save(artwork);
    savedArtwork.images = await this.uploadImages(
      savedArtwork,
      files,
      dto.primaryImageIndex ?? 0,
    );

    return this.artworkRepository.save(savedArtwork);
  }

  async update(
    id: string,
    dto: UpdateArtworkDto,
    files: Express.Multer.File[],
  ): Promise<Artwork> {
    const artwork = await this.findOne(id);
    const nextPrice = dto.price ?? Number(artwork.price);
    const nextOnSale = dto.onSale ?? artwork.onSale;
    const nextDiscountPrice =
      dto.discountPrice !== undefined
        ? dto.discountPrice
        : artwork.discountPrice === null
          ? undefined
          : Number(artwork.discountPrice);
    this.validatePricing(nextPrice, nextDiscountPrice, nextOnSale);

    if (dto.categoryId !== undefined) {
      artwork.category = await this.findCategory(dto.categoryId);
    }

    if (dto.titleAr !== undefined) artwork.titleAr = dto.titleAr;
    if (dto.titleEn !== undefined) artwork.titleEn = dto.titleEn;
    if (dto.storyAr !== undefined) artwork.storyAr = dto.storyAr;
    if (dto.storyEn !== undefined) artwork.storyEn = dto.storyEn;
    if (dto.price !== undefined) artwork.price = this.toMoney(dto.price);
    if (dto.discountPrice !== undefined || dto.onSale !== undefined) {
      artwork.discountPrice =
        nextOnSale && nextDiscountPrice !== undefined
          ? this.toMoney(nextDiscountPrice)
          : null;
    }
    if (dto.onSale !== undefined) artwork.onSale = dto.onSale;
    if (dto.quantity !== undefined) {
      artwork.quantity = dto.quantity;
      artwork.status = this.getStatus(dto.quantity);
    }
    if (dto.isBestSeller !== undefined) artwork.isBestSeller = dto.isBestSeller;

    if (files.length > 0) {
      this.validatePrimaryImageIndex(dto.primaryImageIndex, files.length);
      await this.imageRepository.delete({ artwork: { id: artwork.id } });
      artwork.images = await this.uploadImages(
        artwork,
        files,
        dto.primaryImageIndex ?? 0,
      );
    } else if (dto.primaryImageIndex !== undefined) {
      this.validatePrimaryImageIndex(
        dto.primaryImageIndex,
        artwork.images.length,
      );
      artwork.images = artwork.images.map((image, index) => ({
        ...image,
        isPrimary: index === dto.primaryImageIndex,
      }));
    }

    const savedArtwork = await this.artworkRepository.save(artwork);
    return this.findOne(savedArtwork.id);
  }

  async remove(id: string): Promise<void> {
    const artwork = await this.findOne(id);
    await this.artworkRepository.remove(artwork);
  }

  private createPublicQueryBuilder(): SelectQueryBuilder<Artwork> {
    return this.artworkRepository
      .createQueryBuilder('artwork')
      .leftJoinAndSelect('artwork.category', 'category')
      .leftJoinAndSelect('artwork.images', 'image')
      .where('artwork.status = :status', {
        status: ArtworkStatus.AVAILABLE,
      });
  }

  private async findCategory(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (category === null) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async uploadImages(
    artwork: Artwork,
    files: Express.Multer.File[],
    primaryImageIndex: number,
  ): Promise<ArtworkImage[]> {
    const uploads: CloudinaryUploadResult[] = await Promise.all(
      files.map((file) => this.cloudinaryService.uploadImage(file)),
    );

    return uploads.map((upload, index) =>
      this.imageRepository.create({
        url: upload.secureUrl,
        publicId: upload.publicId,
        isPrimary: index === primaryImageIndex,
        artwork,
      }),
    );
  }

  private validatePricing(
    price: number,
    discountPrice: number | undefined,
    onSale: boolean,
  ): void {
    if (onSale && discountPrice === undefined) {
      throw new BadRequestException(
        'discountPrice is required when onSale is true',
      );
    }

    if (discountPrice !== undefined && discountPrice >= price) {
      throw new BadRequestException(
        'discountPrice must be lower than the original price',
      );
    }
  }

  private validatePrimaryImageIndex(
    primaryImageIndex: number | undefined,
    imageCount: number,
  ): void {
    if (
      primaryImageIndex !== undefined &&
      (primaryImageIndex < 0 || primaryImageIndex >= imageCount)
    ) {
      throw new BadRequestException(
        'primaryImageIndex must reference an uploaded image',
      );
    }
  }

  private getStatus(quantity: number): ArtworkStatus {
    return quantity === 0 ? ArtworkStatus.SOLD_OUT : ArtworkStatus.AVAILABLE;
  }

  private toMoney(value: number): string {
    return value.toFixed(2);
  }

  private shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }

    return items;
  }
}
