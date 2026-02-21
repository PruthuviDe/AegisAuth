// =============================================================================
// AegisAuth — Application Entry Point
// =============================================================================
// WHY this setup:
// - Global validation pipe: Rejects malformed requests before they reach handlers
// - Cookie parser: Enables HTTP-only cookie auth (more secure than localStorage)
// - Helmet: Sets security headers (XSS, clickjacking, MIME sniffing)
// - CORS: Restricts origins to the frontend URL only
// - Global exception filter: Consistent error responses
// - Global interceptor: Consistent success responses
// - Swagger: API documentation for development
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Global Prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Security ───────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────────────
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Validation ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Filter & Interceptor ────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger (Development Only) ─────────────────────────────────────────
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AegisAuth API')
      .setDescription('Authentication & Authorization Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('aegis_refresh_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  // ── Start ──────────────────────────────────────────────────────────────
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`AegisAuth running on http://localhost:${port}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}
bootstrap();

