import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // required for DatabaseModule.onApplicationShutdown to run and close the pool
  app.enableShutdownHooks();
  // RNF-SEG5: the per-IP throttler keys on req.ip. Behind a reverse proxy
  // that is the proxy's address unless Express is told how many hops to
  // trust, which would collapse every client into a single shared bucket --
  // no longer per-IP, and one attacker could exhaust it for everybody.
  // 0 (the default) is correct when nothing fronts the app, as in local dev.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
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
