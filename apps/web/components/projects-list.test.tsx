import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PublicProjectListItem } from '../lib/projects';
import messages from '../messages/pt.json';
import { ProjectsList } from './projects-list';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      revert: jest.fn(),
      from: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function project(
  overrides: Partial<PublicProjectListItem> = {},
): PublicProjectListItem {
  return {
    id: overrides.id ?? '1',
    slug: overrides.slug ?? 'projeto',
    title: overrides.title ?? 'Projeto',
    description: overrides.description ?? 'Descrição do projeto.',
    techStack: overrides.techStack ?? [],
    repoUrl: overrides.repoUrl ?? null,
    demoUrl: overrides.demoUrl ?? null,
    coverImageUrl: overrides.coverImageUrl ?? null,
    status: overrides.status ?? 'completed',
    featured: overrides.featured ?? false,
    completedAt: overrides.completedAt ?? null,
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function renderList(projects: PublicProjectListItem[], failed = false) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <ProjectsList projects={projects} failed={failed} />
    </NextIntlClientProvider>,
  );
}

describe('ProjectsList', () => {
  it('is headed as the Projetos page', () => {
    renderList([]);

    expect(
      screen.getByRole('heading', { level: 1, name: messages.projects.title }),
    ).toBeVisible();
  });

  it('renders one card per project, in the order given', () => {
    renderList([
      project({ id: '1', title: 'Primeiro', slug: 'primeiro' }),
      project({ id: '2', title: 'Segundo', slug: 'segundo' }),
    ]);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Primeiro');
    expect(links[0]).toHaveAttribute('href', '/pt/projetos/primeiro');
    expect(links[1]).toHaveTextContent('Segundo');
  });

  it('shows title, description and tech stack on each card', () => {
    renderList([
      project({
        title: 'ByMySelf',
        description: 'Portfólio pessoal.',
        techStack: ['NestJS', 'Next.js'],
      }),
    ]);

    expect(screen.getByText('ByMySelf')).toBeVisible();
    expect(screen.getByText('Portfólio pessoal.')).toBeVisible();
    expect(screen.getByText('NestJS')).toBeVisible();
    expect(screen.getByText('Next.js')).toBeVisible();
  });

  it('visually distinguishes a featured project', () => {
    renderList([project({ title: 'Projeto em destaque', featured: true })]);

    expect(screen.getByText(messages.projects.featured)).toBeVisible();
  });

  it('does not show the featured badge on a regular project', () => {
    renderList([project({ title: 'Comum', featured: false })]);

    expect(
      screen.queryByText(messages.projects.featured),
    ).not.toBeInTheDocument();
  });

  it('gives a featured card more grid width than a regular one', () => {
    renderList([
      project({ title: 'Destaque', featured: true }),
      project({ title: 'Comum', slug: 'comum', featured: false }),
    ]);

    const [featuredItem, regularItem] = screen.getAllByRole('listitem');
    expect(featuredItem).toHaveClass('sm:col-span-2');
    expect(regularItem).not.toHaveClass('sm:col-span-2');
  });

  it('says so when there is nothing published yet', () => {
    renderList([]);

    expect(screen.getByText(messages.projects.empty)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows an error message instead of the list when the fetch failed', () => {
    renderList([project({ title: 'Não deveria aparecer' })], true);

    expect(screen.getByText(messages.projects.error)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText('Não deveria aparecer')).not.toBeInTheDocument();
  });
});
