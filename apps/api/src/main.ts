import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // required for DatabaseModule.onApplicationShutdown to run and close the pool
  app.enableShutdownHooks();
  // RNF-SEG7: restricted to the frontend origin, no wildcard. credentials:true
  // is required for the browser to send the HttpOnly auth cookies cross-origin.
  app.enableCors({ origin: env.FRONTEND_URL, credentials: true });
  // reads the refresh token cookie in AuthController.logout
  app.use(cookieParser());
  // RNF-SEG9: every request body validated via Zod at the boundary
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(env.PORT);
}
void bootstrap();
