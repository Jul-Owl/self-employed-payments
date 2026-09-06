import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getRuntimeConfiguration } from './config/app-environment';

async function bootstrap() {
  const { port, webUrl } = getRuntimeConfiguration();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: webUrl,
    credentials: true,
  });

  await app.listen(port);

  console.log(`🚀 API started on http://localhost:${port}`);
}

bootstrap();
