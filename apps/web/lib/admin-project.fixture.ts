import type { AdminProject } from './admin-projects';

/**
 * Um AdminProject mínimo e válido para os testes espalharem por cima.
 *
 * Existe pelo mesmo motivo de `makeProfile`: cada teste que precisava de um
 * projeto soletrava o objeto inteiro, então um campo novo em `AdminProject`
 * quebrava todos de uma vez sem nada a aprender com a falha. Agora o campo
 * novo entra aqui e quem não se importa com ele continua passando.
 *
 * Tudo que é opcional começa vazio, para um teste só declarar o que está de
 * fato exercitando.
 */
export function makeAdminProject(
  overrides: Partial<AdminProject> = {},
): AdminProject {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'projeto',
    title: { pt: 'Projeto' },
    description: { pt: 'Descrição.' },
    content: { pt: 'Conteúdo.' },
    techStack: [],
    repoUrl: null,
    demoUrl: null,
    coverImageUrl: null,
    status: 'completed',
    featured: false,
    order: 0,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
