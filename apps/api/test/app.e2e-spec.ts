import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * A raiz não responde — verificado ponta a ponta, sobre o `AppModule` real.
 *
 * Era o e2e de scaffold do Nest, afirmando que `GET /` devolvia
 * 'Hello World!'. A #90 removeu `AppController` e `AppService`, e este arquivo
 * passou a testar código que não existe. Fica fora do `rootDir` do jest de
 * unidade (`src`), então `pnpm test` não o executa — foi assim que a remoção
 * passou verde localmente e reprovou no CI, que roda `test:e2e` à parte.
 *
 * Repropositado em vez de apagado: é a contraparte de integração do
 * `app.module.spec.ts`, que confere o metadado. Aquele pega o scaffold voltando
 * pela porta da frente (um `nest generate` registrando o controller de novo);
 * este pega qualquer módulo passando a atender a raiz, venha de onde vier.
 *
 * Não consulta `/health` de propósito, embora seja o contrato documentado: essa
 * rota faz `select 1` no Postgres, e o job de CI não tem banco nenhum. O teste
 * passaria a falhar por conexão em vez de por comportamento — e `/health` já
 * está coberto por health.controller.spec.ts. Aqui só se monta a aplicação, o
 * que não abre conexão.
 */
describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers 404 on / , which no route claims', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });
});
