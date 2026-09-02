import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { corsOptions } from './cors-options';
import { securityHeaders } from './security-headers';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  // RNF-SEG5: the per-IP throttler keys on req.ip. Behind a reverse proxy
  // that is the proxy's address unless Express is told how many hops to
  // trust, which would collapse every client into a single shared bucket --
  // no longer per-IP, and one attacker could exhaust it for everybody.
  // 0 (the default) is correct when nothing fronts the app, as in local dev.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  // RNF-SEG6. Ver security-headers.ts para por que o HSTS e condicional.
  app.use(securityHeaders(env.NODE_ENV, env.FRONTEND_URL));
  // RNF-SEG7. Ver cors-options.ts.
  app.enableCors(corsOptions(env.NODE_ENV, env.FRONTEND_URL));
  // RNF-SEG9: every request body validated via Zod at the boundary
  app.useGlobalPipes(new ZodValidationPipe());
  setupSwagger(app, env.NODE_ENV);
  await app.listen(env.PORT);
}
void bootstrap();
