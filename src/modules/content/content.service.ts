import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CloudinaryService,
  type CloudinaryUploadResult,
} from '../../shared/cloudinary/cloudinary.service';
import { UpdateAboutDto } from './dto/update-about.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import {
  CONTENT_SECTION_KEYS,
  ContentSectionKey,
  SiteContent,
  SiteContentData,
} from './entities/site-content.entity';

type ContentUpdateDto = UpdateHeroDto | UpdateAboutDto | UpdateContactDto;

export type SiteInfoResponse = Record<
  ContentSectionKey,
  SiteContentData | null
>;

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(SiteContent)
    private readonly contentRepository: Repository<SiteContent>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResult> {
    return this.cloudinaryService.uploadImage(file);
  }

  async updateSection(
    sectionKey: string,
    body: Record<string, unknown>,
  ): Promise<SiteContent> {
    const validatedSectionKey = this.parseSectionKey(sectionKey);
    const data = await this.validateSection(validatedSectionKey, body);
    const existingContent = await this.contentRepository.findOne({
      where: { sectionKey: validatedSectionKey },
    });

    if (existingContent !== null) {
      existingContent.data = data;
      return this.contentRepository.save(existingContent);
    }

    const content = this.contentRepository.create({
      sectionKey: validatedSectionKey,
      data,
    });

    return this.contentRepository.save(content);
  }

  async getSiteInfo(): Promise<SiteInfoResponse> {
    const sections = await this.contentRepository.find({
      where: { sectionKey: In([...CONTENT_SECTION_KEYS]) },
    });
    const siteInfo: SiteInfoResponse = {
      hero: null,
      about: null,
      contact: null,
    };

    for (const section of sections) {
      siteInfo[section.sectionKey] = section.data;
    }

    return siteInfo;
  }

  private parseSectionKey(sectionKey: string): ContentSectionKey {
    if (CONTENT_SECTION_KEYS.includes(sectionKey as ContentSectionKey)) {
      return sectionKey as ContentSectionKey;
    }

    throw new BadRequestException(
      'sectionKey must be one of: hero, about, contact',
    );
  }

  private async validateSection(
    sectionKey: ContentSectionKey,
    body: Record<string, unknown>,
  ): Promise<SiteContentData> {
    const dto = this.createSectionDto(sectionKey, body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatValidationErrors(errors));
    }

    return { ...dto };
  }

  private createSectionDto(
    sectionKey: ContentSectionKey,
    body: Record<string, unknown>,
  ): ContentUpdateDto {
    switch (sectionKey) {
      case 'hero':
        return plainToInstance(UpdateHeroDto, body);
      case 'about':
        return plainToInstance(UpdateAboutDto, body);
      case 'contact':
        return plainToInstance(UpdateContactDto, body);
    }
  }

  private formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((error: ValidationError): string[] =>
      Object.values(error.constraints ?? {}),
    );
  }
}
