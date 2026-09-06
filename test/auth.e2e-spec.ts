import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { User } from '../src/modules/auth/entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthController (integration)', () => {
  const compareMock = bcrypt.compare as unknown as jest.Mock<Promise<boolean>>;
  let app: import('@nestjs/common').INestApplication;
  let usersRepository: {
    createQueryBuilder: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeAll(async () => {
    usersRepository = {
      createQueryBuilder: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor<unknown>());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in through POST /api/v1/auth/login', async () => {
    const user = {
      id: 'user-id',
      email: 'admin@example.com',
      password: 'hashed-password',
      fullName: 'Administrator',
    } as User;
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    compareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('integration-token');

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'correct-password' })
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      statusCode: 201,
      data: { access_token: 'integration-token' },
      message: 'Request successful',
    });
  });

  it('rejects an invalid email through the global validation pipe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'password' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(400);
  });

  it('rejects non-whitelisted request properties', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password',
        unexpected: true,
      })
      .expect(400);
  });
});
