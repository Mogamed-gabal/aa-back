import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import configuration, { type Configuration } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { ArtworksModule } from './modules/artworks/artworks.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<Configuration>,
      ): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.getOrThrow('database.host', { infer: true }),
        port: configService.getOrThrow('database.port', { infer: true }),
        username: configService.getOrThrow('database.username', {
          infer: true,
        }),
        password: configService.getOrThrow('database.password', {
          infer: true,
        }),
        database: configService.getOrThrow('database.database', {
          infer: true,
        }),
        namingStrategy: new SnakeNamingStrategy(),
        autoLoadEntities: true,
        synchronize: configService.getOrThrow('database.synchronize', {
          infer: true,
        }),
        logging: configService.getOrThrow('database.logging', { infer: true }),
        ssl: configService.getOrThrow('database.ssl', { infer: true })
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    AuthModule,
    ContentModule,
    ArtworksModule,
    OrdersModule,
    CoursesModule,
  ],
})
export class AppModule {}
