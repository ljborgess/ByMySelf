import { AppModule } from './app.module';

/**
 * Guarda a remoção do scaffold (#90).
 *
 * `AppController` e `AppService` existiam só para um `GET /` respondendo
 * 'Hello World!' -- superfície que ninguém mantinha, viva numa API que atende
 * num domínio público. Saíram, e o Nest passa a devolver 404 na raiz, que é a
 * resposta correta para uma rota que não existe.
 *
 * A asserção é sobre o metadado do módulo, e não sobre uma requisição HTTP,
 * porque subir o `AppModule` de verdade arrastaria o `DatabaseModule` e exigiria
 * um Postgres -- custo que não se paga para provar a ausência de uma rota. O
 * que importa é o gatilho: `nest generate` recria `app.controller.ts` e o
 * registra aqui, e é esse commit que este teste reprova.
 *
 * O que ele *não* prova: que nenhum módulo de domínio declare uma rota na raiz.
 * Nenhum declara, e um que passasse a declarar seria escolha deliberada num
 * controller de domínio -- não a volta silenciosa do scaffold, que é o que
 * aqui se vigia.
 */
describe('AppModule', () => {
  it('declares no controllers of its own', () => {
    const controllers: unknown[] =
      (Reflect.getMetadata('controllers', AppModule) as unknown[]) ?? [];

    expect(controllers).toEqual([]);
  });

  /**
   * O `CsrfGuard` global é o único provider que o módulo raiz tem razão de
   * ter (RNF-SEG3). Se `AppService` voltar, volta por aqui.
   */
  it('provides only the global CSRF guard', () => {
    const providers: unknown[] =
      (Reflect.getMetadata('providers', AppModule) as unknown[]) ?? [];

    expect(providers).toHaveLength(1);
  });
});
