import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsBoolean, validateSync } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export class AppConfig {
  @IsString()
  NODE_ENV: string = 'development';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_CORS: boolean = true;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SWAGGER: boolean = true;

  @IsString()
  @IsOptional()
  SWAGGER_TITLE: string = 'L2 Research API';

  @IsString()
  @IsOptional()
  SWAGGER_DESCRIPTION: string = 'API for L2 gas analysis and benchmarking';

  @IsString()
  @IsOptional()
  SWAGGER_VERSION: string = '1.0';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_LOGGING: boolean = true;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REQUEST_TIMEOUT: number = 30000; // 30 seconds

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  MAX_REQUEST_SIZE: number = 10485760; // 10MB

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  ENABLE_RATE_LIMITING: boolean = true;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_TTL: number = 60; // 1 minute

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_MAX: number = 100; // 100 requests per minute
}

export default registerAs('app', (): AppConfig => {
  const config = plainToClass(AppConfig, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`App configuration validation failed: ${errorMessages}`);
  }

  return config;
});

export const getAppConfig = () => {
  return plainToClass(AppConfig, process.env, {
    enableImplicitConversion: true,
  });
};