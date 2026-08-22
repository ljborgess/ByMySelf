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
    response = await fetch(`${apiUrl}/admin/projects`, {
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

  if (!response.ok) {
    return { ok: false, reason: 'failed' };
  }

  // O parse fica dentro do try, e o resultado é conferido. Um 200 com corpo
  // que não é JSON faria o `json()` rejeitar *fora* deste módulo, direto de um
  // async Server Component — e não existe error.tsx em nenhum ponto da app,
  // então a pessoa veria a tela de erro genérica do Next em vez do estado de
  // erro que a tabela sabe renderizar. Um 200 com corpo que não é array
  // chegaria em `projects.map` e quebraria do mesmo jeito.
  try {
    const body: unknown = await response.json();

    if (!Array.isArray(body)) {
      return { ok: false, reason: 'failed' };
    }

    return { ok: true, projects: body as AdminProject[] };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
