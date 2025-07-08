import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IsString, IsNumber, IsBoolean, IsOptional, validateSync } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export class DatabaseConfig {
  @IsString()
  DB_TYPE: string = 'postgres';

  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DB_PORT: number = 5432;

  @IsString()
  DB_USERNAME: string = 'postgres';

  @IsString()
  DB_PASSWORD: string = 'password';

  @IsString()
  DB_NAME: string = 'benchmark_db';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DB_SYNCHRONIZE: boolean = true; // Only for development

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DB_LOGGING: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DB_AUTO_LOAD_ENTITIES: boolean = true;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_CONNECTION_TIMEOUT: number = 60000; // 60 seconds

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_ACQUIRE_TIMEOUT: number = 60000; // 60 seconds

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_MAX_CONNECTIONS: number = 10;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_MIN_CONNECTIONS: number = 0;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_IDLE_TIMEOUT: number = 10000; // 10 seconds

  @IsString()
  @IsOptional()
  DB_SSL_MODE: string = 'disable';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DB_RETRY_ATTEMPTS: boolean = true;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_RETRY_DELAY: number = 3000; // 3 seconds
}

export default registerAs('database', (): TypeOrmModuleOptions => {
  const config = plainToClass(DatabaseConfig, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Database configuration validation failed: ${errorMessages}`);
  }

  return {
    type: config.DB_TYPE as any,
    host: config.DB_HOST,
    port: config.DB_PORT,
    username: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    synchronize: config.DB_SYNCHRONIZE,
    logging: config.DB_LOGGING,
    autoLoadEntities: config.DB_AUTO_LOAD_ENTITIES,
    connectTimeoutMS: config.DB_CONNECTION_TIMEOUT,
    ssl: config.DB_SSL_MODE !== 'disable' ? { rejectUnauthorized: false } : false,
    retryAttempts: config.DB_RETRY_ATTEMPTS ? 5 : 0,
    retryDelay: config.DB_RETRY_DELAY,
    // Entity paths will be auto-loaded
    entities: [],
    // Migration settings
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // Set to true for auto-migration in production
  };
});

export const getDatabaseConfig = (): DatabaseConfig => {
  return plainToClass(DatabaseConfig, process.env, {
    enableImplicitConversion: true,
  });
};