import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'docs';

/**
 * RNF-SEG11: never exposes the API's internal shape (routes, DTOs) on a
 * public production URL, so it is only ever mounted outside production.
 */
export function setupSwagger(app: INestApplication, nodeEnv: string): void {
  if (nodeEnv === 'production') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('ByMySelf API')
    .setDescription('Painel administrativo e site público')
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
