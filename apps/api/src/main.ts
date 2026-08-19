import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // required for DatabaseModule.onApplicationShutdown to run and close the pool
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
void bootstrap();
