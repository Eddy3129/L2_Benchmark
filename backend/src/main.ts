import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Allow requests from your frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you need to send cookies or auth headers
  });
  
  await app.listen(process.env.PORT ?? 3001); // Also note: should be 3001 to match your error
}
bootstrap();