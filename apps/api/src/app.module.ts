import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './common/csrf.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';

/**
 * Sem `controllers` proprios: as rotas vivem nos modulos de dominio.
 *
 * `AppController` e `AppService` foram removidos na #90. Eram scaffold do
 * Nest, e a unica coisa que sobrava deles era um `GET /` respondendo
 * 'Hello World!' numa API que atende num dominio publico -- superficie que
 * ninguem mantinha. O 404 que o Nest passa a dar e a resposta correta para
 * uma rota que nao existe; quem precisa de sinal de vida usa `/health`, que
 * e o contrato documentado (docs/arquitetura.md).
 */
@Module({
  imports: [DatabaseModule, HealthModule, AuthModule, ProjectsModule],
  providers: [
    // RNF-SEG3: global, not just auth routes -- see CsrfGuard's own comment.
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
