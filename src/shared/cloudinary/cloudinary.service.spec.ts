import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  type UploadApiErrorResponse,
  type UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

type UploadCallback = (
  error: UploadApiErrorResponse | undefined,
  result: UploadApiResponse | undefined,
) => void;

describe('CloudinaryService', () => {
  it('uploads an image as WebP with automatic quality', async () => {
    const uploadStream = { end: jest.fn() };
    const response = {
      secure_url: 'https://res.cloudinary.com/demo/image/upload/content.webp',
      public_id: 'art-gallery/content/image',
    } as UploadApiResponse;
    const uploadStreamMock = jest
      .fn()
      .mockImplementation(
        (
          options: { format?: string; quality?: string },
          callback: UploadCallback,
        ) => {
          expect(options).toEqual(
            expect.objectContaining({
              format: 'webp',
              quality: 'auto',
            }),
          );
          callback(undefined, response);
          return uploadStream;
        },
      );
    const client = {
      uploader: { upload_stream: uploadStreamMock },
    } as unknown as typeof cloudinary;
    const service = new CloudinaryService(client);
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;

    const result = await service.uploadImage(file);

    expect(result).toEqual({
      secureUrl: response.secure_url,
      publicId: response.public_id,
    });
    expect(uploadStream).toHaveProperty('end');
    expect(uploadStream.end).toHaveBeenCalledWith(file.buffer);
  });

  it('rejects a missing file buffer', async () => {
    const client = {
      uploader: { upload_stream: jest.fn() },
    } as unknown as typeof cloudinary;
    const service = new CloudinaryService(client);

    await expect(
      service.uploadImage({} as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps Cloudinary errors to an internal server error', async () => {
    const uploadStream = { end: jest.fn() };
    const error = {
      message: 'Cloudinary unavailable',
    } as UploadApiErrorResponse;
    const uploadStreamMock = jest
      .fn()
      .mockImplementation((_options: unknown, callback: UploadCallback) => {
        callback(error, undefined);
        return uploadStream;
      });
    const client = {
      uploader: { upload_stream: uploadStreamMock },
    } as unknown as typeof cloudinary;
    const service = new CloudinaryService(client);
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;

    await expect(service.uploadImage(file)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
