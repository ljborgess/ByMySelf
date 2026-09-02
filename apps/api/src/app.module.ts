import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from './common/throttle.constants';
import { CsrfGuard } from './common/csrf.guard';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';

/**
 * Sem `controllers` proprios: as rotas vivem nos modulos de dominio.
 *
 * Sem banco, sem auth (docs/decisao-projetos-github-pins.md): a API é hoje
 * um proxy fino pro GitHub GraphQL, mais o readiness probe.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: PUBLIC_READ_THROTTLE_NAME,
        ttl: PUBLIC_READ_THROTTLE_TTL_MS,
        limit: PUBLIC_READ_THROTTLE_LIMIT,
      },
    ]),
    HealthModule,
    ProjectsModule,
  ],
  providers: [
    // RNF-SEG3: global, so every future mutating route inherits it
    // automatically.
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
