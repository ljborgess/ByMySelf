import { cookies } from 'next/headers';
import type { LocalizedText, ProjectStatus } from '@portfolio/shared';
import { ACCESS_TOKEN_COOKIE } from './admin-routes';

/**
 * O que `GET /admin/projects` devolve: a linha crua, não a projeção pública.
 *
 * `title` e `description` continuam bilíngues aqui — o painel é a ferramenta
 * de edição, então mostra o conteúdo como ele está armazenado em vez de já
 * resolvido para um idioma. Datas chegam como string ISO porque isto é
 * `response.json()` verbatim, e tipá-las como `Date` seria uma mentira que o
 * compilador não pegaria.
 */
export interface AdminProject {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  // O markdown da página de detalhe. Já vinha na resposta (estas são as
  // linhas cruas), e o formulário de edição precisa dele para pré-preencher.
  content: LocalizedText;
  techStack: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  coverImageUrl: string | null;
  status: ProjectStatus;
  featured: boolean;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminProjectsResult =
  | { ok: true; projects: AdminProject[] }
  /**
   * `unauthenticated` é separado de `failed` porque leva a lugares
   * diferentes: sessão expirada manda para o login, API fora mostra estado de
   * erro na própria tela. Tratar os dois igual jogaria alguém com sessão
   * válida para o login só porque o backend piscou.
   */
  | { ok: false; reason: 'unauthenticated' | 'failed' };

/**
 * RF-PROJ4: todo projeto, arquivado incluído.
 *
 * Server-side, e por isso precisa repassar o cookie à mão: ele é `HttpOnly`,
 * então quem o tem é a requisição que chegou no Next, não o `fetch` que sai
 * daqui. Sem repassar, a API responde 401 e o painel pareceria sempre
 * deslogado.
 *
 * Soft-deleted fica de fora porque `includeDeleted` não é passado — é o
 * default da API, e é o que faz remover parecer remover (user story 5).
 * Restaurar um projeto é a #26.
 */
export async function getAdminProjects(): Promise<AdminProjectsResult> {
  const result = await fetchAdmin('/admin/projects');

  if (!result.ok) {
    // `notFound` não é alcançável numa listagem; dobrá-lo em `failed` evita
    // acrescentar ao tipo público um caso que nunca acontece.
    return {
      ok: false,
      reason:
        result.reason === 'unauthenticated' ? 'unauthenticated' : 'failed',
    };
  }

  // Um 200 cujo corpo não é array chegaria em `projects.map` e quebraria a
  // renderização dentro de um async Server Component, onde não há error.tsx
  // para pegar.
  if (!Array.isArray(result.body)) {
    return { ok: false, reason: 'failed' };
  }

  return { ok: true, projects: result.body as AdminProject[] };
}

export type AdminProjectResult =
  | { ok: true; project: AdminProject }
  /**
   * `notFound` é separado de `failed` pelo mesmo motivo que
   * `unauthenticated`: um id que não existe é um 404 da rota de edição, e
   * a API fora é um estado de erro na tela. Tratá-los igual mostraria
   * "projeto não encontrado" toda vez que o backend piscasse.
   */
  | { ok: false; reason: 'unauthenticated' | 'notFound' | 'failed' };

/**
 * RF-PROJ2. Um projeto pelo id, para o formulário de edição chegar
 * pré-preenchido em vez de exigir redigitar o que já existe.
 *
 * Server-side pelo mesmo motivo da listagem: o cookie de sessão é
 * `HttpOnly`, então quem o tem é a requisição que chegou no Next.
 */
export async function getAdminProject(id: string): Promise<AdminProjectResult> {
  const result = await fetchAdmin(`/admin/projects/${encodeURIComponent(id)}`);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  // Mesmo cuidado da listagem, invertido: aqui o esperado é um objeto, e um
  // array ou `null` num 200 chegaria no formulário como projeto sem campos.
  if (
    typeof result.body !== 'object' ||
    result.body === null ||
    Array.isArray(result.body)
  ) {
    return { ok: false, reason: 'failed' };
  }

  return { ok: true, project: result.body as AdminProject };
}

type AdminFetchResult =
  | { ok: true; body: unknown }
  | { ok: false; reason: 'unauthenticated' | 'notFound' | 'failed' };

/**
 * A parte que as duas leituras do painel têm em comum: repassar o cookie,
 * não cachear, e traduzir status HTTP em desfechos que a tela sabe tratar.
 *
 * O parse do JSON fica aqui dentro e o resultado é conferido por quem chama.
 * Um 200 com corpo que não é JSON faria o `json()` rejeitar *fora* deste
 * módulo, direto de um async Server Component — e não existe error.tsx em
 * nenhum ponto da app, então a pessoa veria a tela de erro genérica do Next
 * em vez do estado de erro que a página sabe renderizar.
 */
async function fetchAdmin(path: string): Promise<AdminFetchResult> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3100';
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE);

  if (!token) {
    // O proxy já redireciona antes de chegar aqui; isto cobre o caso de a
    // página ser renderizada por outro caminho, e evita gastar uma chamada
    // que só pode dar 401.
    return { ok: false, reason: 'unauthenticated' };
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      // Nunca cacheado: é a tela de trabalho do dono, e ver uma versão de
      // trinta segundos atrás depois de editar seria pior que esperar.
      cache: 'no-store',
      headers: { Cookie: `${ACCESS_TOKEN_COOKIE}=${token.value}` },
    });
  } catch {
    return { ok: false, reason: 'failed' };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthenticated' };
  }

  // 404 e 400 são o mesmo desfecho numa busca por id: a rota da API valida o
  // id com ParseUUIDPipe, então um segmento que não é UUID vira 400 — e para
  // quem digitou a URL isso é indistinguível de um projeto que não existe.
  if (response.status === 404 || response.status === 400) {
    return { ok: false, reason: 'notFound' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'failed' };
  }

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
