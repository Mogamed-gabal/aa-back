import * as Joi from 'joi';

export interface EnvironmentVariables {
  readonly NODE_ENV: 'development' | 'test' | 'production';
  readonly PORT: number;
  readonly CORS_ORIGIN: string;
  readonly DB_HOST: string;
  readonly DB_PORT: number;
  readonly DB_USERNAME: string;
  readonly DB_PASSWORD: string;
  readonly DB_DATABASE: string;
  readonly DB_SYNCHRONIZE: boolean;
  readonly DB_LOGGING: boolean;
  readonly DB_SSL: boolean;
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRES_IN: string;
  readonly ADMIN_EMAIL: string;
  readonly ADMIN_PASSWORD: string;
  readonly CLOUDINARY_CLOUD_NAME: string;
  readonly CLOUDINARY_API_KEY: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly PAYMOB_API_KEY: string;
  readonly PAYMOB_INTEGRATION_ID: string;
  readonly PAYMOB_IFRAME_ID: string;
  readonly PAYMOB_HMAC_SECRET: string;
  readonly GMAIL_USER: string;
  readonly GMAIL_APP_PASSWORD: string;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  PAYMOB_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  PAYMOB_INTEGRATION_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.number().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  PAYMOB_IFRAME_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.number().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  PAYMOB_HMAC_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  GMAIL_USER: Joi.string().email().allow('').default(''),
  GMAIL_APP_PASSWORD: Joi.string().allow('').default(''),
}).unknown(true);
