import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type Configuration } from './config/configuration';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export function setupApp(app: INestApplication): number {
  const configService = app.get(ConfigService<Configuration>);

  setupSecurity(app, configService);
  setupPipes(app);
  setupMiddleware(app);
  setupSwagger(app);

  return configService.getOrThrow('app.port', { infer: true });
}

export function setupSecurity(
  app: INestApplication,
  configService: ConfigService<Configuration>,
): void {
  const corsOrigin = configService.getOrThrow('app.corsOrigin', {
    infer: true,
  });
  const allowedOrigins = corsOrigin
    .split(',')
    .map((origin: string): string => origin.trim())
    .filter((origin: string): boolean => origin.length > 0);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use(helmet());
  app.enableShutdownHooks();
}

export function setupPipes(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor<unknown>());
}

export function setupMiddleware(app: INestApplication): void {
  const loggerMiddleware = new HttpLoggerMiddleware();
  app.use(loggerMiddleware.use.bind(loggerMiddleware));
}

export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Art Gallery API')
    .setDescription('Backend API for the Art Gallery e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
