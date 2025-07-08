import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NetworkConfigService } from './config/network.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Initialize NetworkConfigService
  const configService = app.get(ConfigService);
  const networksConfig = configService.get('networks');
  NetworkConfigService.initialize(networksConfig);
  
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Allow requests from your frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you need to send cookies or auth headers
  });
  
  await app.listen(process.env.PORT ?? 3001); // Also note: should be 3001 to match your error
}
bootstrap();