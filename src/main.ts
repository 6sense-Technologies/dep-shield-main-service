// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Use validation pipes
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Dep Shield API')
    .setDescription('API documentation for Dep Shield application')
    .setVersion('1.0')
    .addBearerAuth() // Add Bearer token authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(8000, '0.0.0.0');
}
bootstrap();
