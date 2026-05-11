import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true,
    }),
  );
  
  app.use(cookieParser());
  const origenesPermitidos = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://flexstudio-two.vercel.app.ar' || 'https://flexstudio-two.vercel.app']
    : ['http://localhost:5173'];   

  app.enableCors({
    origin: origenesPermitidos,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400
  });

  const port = process.env.PORT || 3000;
  await app.listen(port); 
  logger.info(`🚀 Servidor protegido y corriendo en el puerto ${port}`);
}
bootstrap();