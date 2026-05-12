import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);

  console.log(`\n🟢 Lernard WhatsApp service running on port ${port}`);
  console.log(`   Scan the QR code above to connect your WhatsApp number.\n`);
}

void bootstrap();
