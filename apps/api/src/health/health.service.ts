import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  /**
   * Commit que originou esta imagem, gravado no build (`GIT_SHA`).
   *
   * Existe para o pipeline: depois de disparar o deploy, o CI faz polling
   * nesta rota e precisa distinguir o container novo do que ainda está
   * rodando. Sem isso o probe responde `ok` de imediato — vindo da versão
   * *anterior* — e um rollout que nunca começou passaria como sucesso.
   *
   * `unknown` em build local, onde ninguém passa o arg.
   */
  version: string;
}

const BUILD_SHA = process.env.GIT_SHA ?? 'unknown';

/**
 * No banco pra checar (docs/decisao-projetos-github-pins.md removeu o
 * Postgres inteiro) -- este probe agora só confirma que o processo Nest está
 * de pé e respondendo. `/projects` já tem o próprio catch para uma falha do
 * GitHub, que não é o tipo de coisa um readiness probe de infraestrutura
 * deveria decidir se derruba o container.
 */
@Injectable()
export class HealthService {
  check(): HealthStatus {
    return { status: 'ok', version: BUILD_SHA };
  }
}
