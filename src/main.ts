import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN?.split(',').filter(Boolean);

  // Validar que CORS_ORIGIN esté configurado en producción
  if (!corsOrigin || corsOrigin.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGIN debe configurarse en producción');
    }
    // En desarrollo, permitir orígenes locales
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
  }

  // Helmet security headers (CSP desactivado para tablero público)
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`TermiBus API escuchando en http://0.0.0.0:${port}/api`);
}
bootstrap();
