import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['/csrf-token', '/webhooks/billing'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:4000',
      'http://localhost:8081',
      process.env.WEB_URL,
    ].filter(Boolean),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-client-type',
      'x-csrf-token',
      'x-idempotency-key',
    ],
  });

  const port = parseInt(process.env.PORT ?? '4002', 10);
  await app.listen(port);
}
bootstrap();
