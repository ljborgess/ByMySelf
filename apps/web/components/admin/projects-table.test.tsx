import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import type { AdminProject } from '../../lib/admin-projects';
import { AdminProjectsTable } from './projects-table';

function project(overrides: Partial<AdminProject> = {}): AdminProject {
  return {
    id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
    slug: overrides.slug ?? 'projeto',
    title: overrides.title ?? { pt: 'Projeto' },
    description: overrides.description ?? { pt: 'Descrição.' },
    techStack: overrides.techStack ?? [],
    repoUrl: overrides.repoUrl ?? null,
    demoUrl: overrides.demoUrl ?? null,
    coverImageUrl: overrides.coverImageUrl ?? null,
    status: overrides.status ?? 'completed',
    featured: overrides.featured ?? false,
    order: overrides.order ?? 0,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function renderTable(projects: AdminProject[], failed = false) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <AdminProjectsTable
        projects={projects}
        failed={failed}
        newProjectPath="/admin/projects/novo"
        editPathFor={(p) => `/admin/projects/${p.id}`}
      />
    </NextIntlClientProvider>,
  );
}

describe('AdminProjectsTable', () => {
  it('renders one row per project', () => {
    renderTable([
      project({ id: 'a', slug: 'primeiro', title: { pt: 'Primeiro' } }),
      project({ id: 'b', slug: 'segundo', title: { pt: 'Segundo' } }),
    ]);

    expect(screen.getAllByRole('row')).toHaveLength(3); // cabeçalho + 2
    expect(screen.getByText('Primeiro')).toBeVisible();
    expect(screen.getByText('Segundo')).toBeVisible();
  });

  /**
   * User story 1 e 2. Arquivado tem que aparecer na lista — é justamente o
   * status que o site público esconde, e o painel existe para dar visibilidade
   * independente do que está público.
   */
  it.each([
    ['in_progress', messages.adminProjects.status.in_progress],
    ['completed', messages.adminProjects.status.completed],
    ['archived', messages.adminProjects.status.archived],
  ] as const)('shows the %s status as a label', (status, label) => {
    renderTable([project({ status })]);

    expect(screen.getByText(label)).toBeVisible();
  });

  it('lists an archived project alongside the others', () => {
    renderTable([
      project({ id: 'a', title: { pt: 'Ativo' }, status: 'completed' }),
      project({ id: 'b', title: { pt: 'Antigo' }, status: 'archived' }),
    ]);

    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('Antigo')).toBeVisible();
  });

  it('marks a featured project', () => {
    renderTable([project({ featured: true })]);

    expect(screen.getByText(messages.adminProjects.featured)).toBeVisible();
  });

  it('does not mark a regular project as featured', () => {
    renderTable([project({ featured: false })]);

    expect(
      screen.queryByText(messages.adminProjects.featured),
    ).not.toBeInTheDocument();
  });

  it('offers a way to create a project (user story 3)', () => {
    renderTable([project()]);

    expect(
      screen.getByRole('link', { name: messages.adminProjects.create }),
    ).toHaveAttribute('href', '/pt/admin/projects/novo');
  });

  it('links each row to that project edit form (user story 4)', () => {
    renderTable([project({ id: 'abc', title: { pt: 'Meu Projeto' } })]);

    expect(
      screen.getByRole('link', { name: 'Editar Meu Projeto' }),
    ).toHaveAttribute('href', '/pt/admin/projects/abc');
  });

  /**
   * Numa tabela de vinte linhas, vinte links chamados "Editar" são
   * indistinguíveis para quem navega por lista de links — o nome acessível
   * tem que carregar de qual projeto se trata.
   */
  it('gives each edit link an accessible name carrying the project title', () => {
    renderTable([
      project({ id: 'a', title: { pt: 'Alpha' } }),
      project({ id: 'b', title: { pt: 'Beta' } }),
    ]);

    expect(screen.getByRole('link', { name: 'Editar Alpha' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editar Beta' })).toBeVisible();
  });

  describe('os quatro estados da tela de dados', () => {
    it('renders a distinct empty state, not an empty table', () => {
      renderTable([]);

      expect(screen.getByText(messages.adminProjects.empty)).toBeVisible();
      // uma tabela vazia não diz se não há projetos ou se algo falhou
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('offers a way out of the empty state', () => {
      renderTable([]);

      expect(
        screen.getByRole('link', { name: messages.adminProjects.emptyAction }),
      ).toBeVisible();
    });

    it('renders an error state instead of the list when the fetch failed', () => {
      renderTable([], true);

      expect(screen.getByRole('alert')).toHaveTextContent(
        messages.adminProjects.error,
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('does not mistake a failure for an empty list', () => {
      // são coisas diferentes: "você não tem projetos" versus "não deu para
      // saber quais são os seus projetos"
      renderTable([], true);

      expect(
        screen.queryByText(messages.adminProjects.empty),
      ).not.toBeInTheDocument();
    });

    it('keeps the create button reachable even when loading failed', () => {
      // ficar sem saída porque a listagem caiu seria pior que o próprio erro
      renderTable([], true);

      expect(
        screen.getByRole('link', { name: messages.adminProjects.create }),
      ).toBeVisible();
    });
  });
});
