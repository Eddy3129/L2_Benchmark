import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NetworkConfigService } from './shared/network-config.service';
import { AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get configuration services
  const configService = app.get(ConfigService);
  
  // Initialize NetworkConfigService
  const networksConfig = configService.get('networks');
  NetworkConfigService.initialize(networksConfig);
  
  // Get app configuration
  const appConfig = configService.get<AppConfig>('app');
  
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Set global prefix for all routes
  app.setGlobalPrefix(appConfig?.API_PREFIX || 'api');
  
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = appConfig?.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();