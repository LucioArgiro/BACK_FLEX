import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true,
    }),
  );

  app.use(cookieParser()); 
  app.enableCors({ 
    origin: ['http://localhost:5173', process.env.FRONTEND_URL || ''], 
    credentials: true, 
  });
  const port = process.env.PORT || 3000;
  await app.listen(port); 
  console.log(`🚀 Servidor corriendo en el puerto: ${port}`);
}
bootstrap();