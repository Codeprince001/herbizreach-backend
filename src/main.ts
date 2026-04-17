import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const redisUrl = config.get<string>('redisUrl')?.trim();
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app, redisUrl);
    await redisAdapter.connect();
    app.useWebSocketAdapter(redisAdapter);
  }

  const uploadRoot = config.get<string>('uploadDir') ?? './uploads';
  const uploadAbs = join(process.cwd(), uploadRoot);
  const useLocal = config.get<boolean>('useLocalImageUpload') === true;
  if (useLocal) {
    if (!existsSync(join(uploadAbs, 'products'))) {
      mkdirSync(join(uploadAbs, 'products'), { recursive: true });
    }
    if (!existsSync(join(uploadAbs, 'store-profiles'))) {
      mkdirSync(join(uploadAbs, 'store-profiles'), { recursive: true });
    }
    app.useStaticAssets(uploadAbs, { prefix: '/files/' });
  }

  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['http://localhost:3001,https://herbizreach.vercel.app, http://localhost*'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('HerBizReach API')
      .setDescription('REST API for HerBizReach — Women in Tech Hackathon 2026')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT',
      )
      .addTag('auth')
      .addTag('products')
      .addTag('store')
      .addTag('ai')
      .addTag('analytics')
      .addTag('health')
      .addTag('categories')
      .addTag('store-settings')
      .addTag('chat')
      .addTag('admin')
      .addTag('leads')
      .addTag('notifications')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`HerBizReach API listening on http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`OpenAPI: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
