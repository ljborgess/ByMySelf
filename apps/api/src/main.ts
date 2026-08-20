import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // required for DatabaseModule.onApplicationShutdown to run and close the pool
  app.enableShutdownHooks();
  // RNF-SEG6: HSTS, X-Frame-Options, X-Content-Type-Options and the rest of
  // Helmet's defaults, plus a CSP scoped to the one origin this API is ever
  // meant to be embedded by or connect out to.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'connect-src': ["'self'", env.FRONTEND_URL],
          'frame-ancestors': ["'none'"],
        },
      },
    }),
  );
  // RNF-SEG7: restricted to the frontend origin, no wildcard. credentials:true
  // is required for the browser to send the HttpOnly auth cookies cross-origin.
  app.enableCors({ origin: env.FRONTEND_URL, credentials: true });
  // reads the refresh token cookie in AuthController.logout
  app.use(cookieParser());
  // RNF-SEG9: every request body validated via Zod at the boundary
  app.useGlobalPipes(new ZodValidationPipe());
  setupSwagger(app, env.NODE_ENV);
  await app.listen(env.PORT);
}
void bootstrap();
