import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { type Configuration } from '../../config/configuration';

export const CLOUDINARY = Symbol('CLOUDINARY');

export const cloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (
    configService: ConfigService<Configuration>,
  ): typeof cloudinary => {
    cloudinary.config({
      cloud_name: configService.getOrThrow('cloudinary.cloudName', {
        infer: true,
      }),
      api_key: configService.getOrThrow('cloudinary.apiKey', { infer: true }),
      api_secret: configService.getOrThrow('cloudinary.apiSecret', {
        infer: true,
      }),
      secure: true,
    });

    return cloudinary;
  },
};
