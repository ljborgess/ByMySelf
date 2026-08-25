import type { CreateProjectInput, UpdateProjectInput } from '@portfolio/shared';
import { CSRF_HEADER, JSON_MUTATION_HEADERS, publicApiUrl } from './api-client';
import { refreshSession } from './auth';
import type { AdminProject } from './admin-projects';

/**
 * As escritas do painel, feitas **pelo browser**.
 *
 * Arquivo separado de lib/admin-projects.ts de propósito: aquele importa
 * `next/headers`, que só existe no servidor, então um client component que o
 * importasse quebraria o build. O `import type` acima não conta — tipo é
 * apagado na compilação e nada de `next/headers` entra no bundle.
 *
 * Por que browser e não Server Action: os cookies de sessão são `HttpOnly` e
 * `SameSite=Strict`, emitidos pela API. `credentials: 'include'` é o que faz
 * o browser reenviá-los; do servidor seria preciso repassar o cookie à mão a
 * cada chamada, e o token de acesso passaria por mais um processo sem
 * necessidade. É também o caminho que a tela de login já usa (lib/auth.ts).
 */

export type SaveProjectResult =
  /**
   * Sem o projeto salvo: quem chama redireciona para a listagem, que relê da
   * API. Devolver a linha daqui seria um segundo retrato do mesmo dado, com
   * um caminho a mais para ficar desatualizado.
   */
  | { ok: true }
  /**
   * Cada motivo leva a um lugar diferente, e é por isso que são quatro e não
   * um "deu erro":
   *
   * - `unauthenticated`: sessão expirou, vai para o login.
   * - `conflict`: slug em uso — erro de um campo, e a API diz qual projeto o
   *   está segurando, então a mensagem dela vale mais que qualquer texto fixo.
   * - `invalid`: a API recusou o corpo. Não deveria acontecer (o formulário
   *   valida contra o mesmo schema Zod), mas se acontecer a pessoa precisa
   *   ver o motivo em vez de um "falhou" mudo.
   * - `unavailable`: rede, CORS, 5xx. Não é nada que a pessoa possa corrigir
   *   no formulário.
   */
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'conflict'; message: string }
  | {
      ok: false;
      reason: 'invalid';
      message?: string;
      /** Por campo, no formato de caminho do Zod (`title.pt`). */
      fieldErrors?: Record<string, string>;
    }
  | { ok: false; reason: 'unavailable' };

/** RF-PROJ1. `POST /admin/projects`. */
export async function createProject(
  input: CreateProjectInput,
): Promise<SaveProjectResult> {
  return send('POST', '/admin/projects', input);
}

/**
 * RF-PROJ2. `PATCH /admin/projects/:id`.
 *
 * O formulário manda o estado inteiro, não só o que mudou: os campos
 * bilíngues são colunas jsonb e só podem ser substituídas por inteiro, e
 * mandar tudo é o que faz "o projeto fica exatamente como está na tela" ser
 * verdade — inclusive para um campo esvaziado, que vai como `null`.
 */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<SaveProjectResult> {
  return send('PATCH', `/admin/projects/${encodeURIComponent(id)}`, input);
}

/**
 * RF-PROJ3. `DELETE /admin/projects/:id`.
 *
 * Soft delete do lado da API: a linha sobrevive e continua recuperável. Para
 * quem está no painel, porém, o projeto some da listagem — que é o que faz
 * remover parecer remover.
 */
export async function deleteProject(id: string): Promise<DeleteProjectResult> {
  const response = await withSessionRetry(() =>
    fetch(`${publicApiUrl()}/admin/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
      // Sem corpo, então sem `Content-Type` — só o header que o CsrfGuard
      // exige de todo método mutante.
      headers: CSRF_HEADER,
    }),
  );

  if (!response) {
    return { ok: false, reason: 'unavailable' };
  }

  // 204 sem corpo. Nada a interpretar, e por isso nada que possa falhar
  // *depois* de a exclusão já ter acontecido.
  if (response.ok) {
    return { ok: true };
  }

  return { ok: false, reason: reasonFor(response.status) };
}

export type DeleteProjectResult =
  | { ok: true }
  /**
   * `notFound` é desfecho próprio: significa que a listagem estava velha e o
   * projeto já não existe. O resultado que a pessoa queria já vale, então a
   * linha sai da tela em vez de virar erro.
   */
  | { ok: false; reason: 'unauthenticated' | 'notFound' | 'unavailable' };

export type ReorderProjectResult =
  | {
      ok: true;
      /**
       * A listagem inteira já reordenada, como a API devolve — mover um
       * projeto desloca os outros, e a posição nova de um só não diz onde os
       * demais foram parar.
       *
       * Ausente quando o 200 vem com corpo inaproveitável. A escrita
       * aconteceu de qualquer forma, então isso não é falha: quem chama fica
       * com a ordem que já aplicou na tela.
       */
      projects?: AdminProject[];
    }
  | { ok: false; reason: 'unauthenticated' | 'notFound' | 'unavailable' };

/**
 * RF-PROJ5. `PATCH /admin/projects/:id/order`.
 *
 * `position` é o índice de destino na listagem ativa, zero-based — não um
 * valor da coluna `order`. A API reindexa tudo para 0..n-1 a cada movimento,
 * então mandar um valor de coluna não significaria nada. Passar do fim é
 * tratado como "último", e não como erro.
 */
export async function reorderProject(
  id: string,
  position: number,
): Promise<ReorderProjectResult> {
  const response = await withSessionRetry(() =>
    fetch(`${publicApiUrl()}/admin/projects/${encodeURIComponent(id)}/order`, {
      method: 'PATCH',
      credentials: 'include',
      headers: JSON_MUTATION_HEADERS,
      body: JSON.stringify({ order: position }),
    }),
  );

  if (!response) {
    return { ok: false, reason: 'unavailable' };
  }

  if (response.ok) {
    try {
      const body: unknown = await response.json();
      return Array.isArray(body)
        ? { ok: true, projects: body as AdminProject[] }
        : { ok: true };
    } catch {
      // Corpo ilegível num 200: a escrita aconteceu. Chamar de falha faria a
      // pessoa clicar de novo e mover o projeto duas casas.
      return { ok: true };
    }
  }

  return { ok: false, reason: reasonFor(response.status) };
}

/**
 * Faz a chamada e, se a resposta for 401, renova a sessão e repete uma vez.
 *
 * O access token dura 15 minutos e o refresh 30 dias, então "expirou no meio
 * do trabalho" é o caso comum, não a exceção — e mandar a pessoa para o login
 * no meio de um salvamento perderia o que ela estava fazendo.
 *
 * Uma repetição só, e apenas depois de uma renovação bem-sucedida: se o
 * segundo 401 vier mesmo assim, não há sessão a recuperar e insistir vira
 * laço. `refreshSession` compartilha a renovação em voo, então várias
 * chamadas esbarrando no 401 juntas não disparam rotações concorrentes — o
 * que a API leria como reuso de token e derrubaria a família inteira.
 *
 * `send` é uma função e não uma `Request` pronta de propósito: um corpo de
 * `Request` só pode ser consumido uma vez, então repetir exige montar a
 * requisição de novo.
 */
async function withSessionRetry(
  send: () => Promise<Response>,
): Promise<Response | null> {
  let response: Response;

  try {
    response = await send();
  } catch {
    return null;
  }

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed.ok) {
    return response;
  }

  try {
    return await send();
  } catch {
    return null;
  }
}

/**
 * Status HTTP traduzido nos desfechos que a tabela sabe tratar.
 *
 * 400 entra em `notFound` junto com 404: a rota valida o id com
 * ParseUUIDPipe, então um id malformado nunca correspondeu a projeto nenhum —
 * a mesma leitura que lib/admin-projects.ts faz.
 */
function reasonFor(
  status: number,
): 'unauthenticated' | 'notFound' | 'unavailable' {
  if (status === 401) return 'unauthenticated';
  if (status === 404 || status === 400) return 'notFound';
  return 'unavailable';
}

async function send(
  method: 'POST' | 'PATCH',
  path: string,
  input: CreateProjectInput | UpdateProjectInput,
): Promise<SaveProjectResult> {
  const response = await withSessionRetry(() =>
    fetch(`${publicApiUrl()}${path}`, {
      method,
      // sem isto o browser não manda os cookies de sessão, e toda escrita
      // responderia 401 mesmo logado
      credentials: 'include',
      headers: JSON_MUTATION_HEADERS,
      body: JSON.stringify(input),
    }),
  );

  if (!response) {
    return { ok: false, reason: 'unavailable' };
  }

  // O corpo do sucesso não é lido de propósito. Ele traz a linha salva, e
  // ninguém a consome — enquanto tentar interpretá-lo criaria uma falha nova:
  // um 201 com corpo ilegível viraria "não deu para salvar" depois de a
  // escrita já ter acontecido, e a segunda tentativa esbarraria no slug que a
  // primeira acabou de usar.
  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthenticated' };
  }

  if (response.status === 409) {
    const body = await readErrorBody(response);
    return { ok: false, reason: 'conflict', message: body.message ?? '' };
  }

  if (response.status === 400 || response.status === 422) {
    const body = await readErrorBody(response);
    return {
      ok: false,
      reason: 'invalid',
      message: body.message,
      fieldErrors: body.fieldErrors,
    };
  }

  // Um 5xx ou um status inesperado não tem nada que a pessoa possa corrigir
  // no formulário, então o corpo não é nem lido.
  return { ok: false, reason: 'unavailable' };
}

/**
 * Extrai o que a API tem a dizer sobre a recusa.
 *
 * Dois formatos, porque a API produz dois: o ZodValidationPipe responde
 * `{ message: 'Validation failed', errors: [...] }` com as issues do Zod, e
 * uma exceção lançada no service responde `{ message: '<texto>' }`. Ignorar
 * o primeiro perderia justamente a informação por campo.
 */
async function readErrorBody(
  response: Response,
): Promise<{ message?: string; fieldErrors?: Record<string, string> }> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    return {};
  }

  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const { message, errors } = body as {
    message?: unknown;
    errors?: unknown;
  };

  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(errors)) {
    for (const issue of errors) {
      if (typeof issue !== 'object' || issue === null) {
        continue;
      }
      const { path, message: issueMessage } = issue as {
        path?: unknown;
        message?: unknown;
      };
      if (!Array.isArray(path) || typeof issueMessage !== 'string') {
        continue;
      }
      const key = path.join('.');
      // Primeira issue por campo. As seguintes são refinamentos da mesma
      // causa, e empilhá-las daria três mensagens embaixo de um input.
      if (key && fieldErrors[key] === undefined) {
        fieldErrors[key] = issueMessage;
      }
    }
  }

  return {
    // `'Validation failed'` é o texto fixo do pipe, não diagnóstico nenhum:
    // deixá-lo passar mostraria inglês genérico onde o formulário já tem a
    // mensagem por campo.
    message:
      typeof message === 'string' && message !== 'Validation failed'
        ? message
        : undefined,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}
