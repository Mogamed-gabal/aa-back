import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  type UploadApiErrorResponse,
  type UploadApiOptions,
  type UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

export interface CloudinaryUploadResult {
  readonly secureUrl: string;
  readonly publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  constructor(
    @Inject(CLOUDINARY)
    private readonly cloudinaryClient: typeof cloudinary,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResult> {
    if (file === undefined || file.buffer === undefined) {
      throw new BadRequestException(
        'An image file is required and must be stored in memory',
      );
    }

    const options: UploadApiOptions = {
      folder: 'art-gallery/content',
      resource_type: 'image',
      format: 'webp',
      quality: 'auto',
    };

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ): void => {
          if (error !== undefined || result === undefined) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message ?? 'empty response'}`,
            );
            reject(
              new InternalServerErrorException(
                'Image upload to Cloudinary failed',
              ),
            );
            return;
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
