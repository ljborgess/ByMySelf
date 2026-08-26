import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PublicProjectListItem } from '../lib/projects';
import messages from '../messages/pt.json';
import { ProjectsList } from './projects-list';

// ProjectsList renders Carousel (embla-carousel-react), which needs
// ResizeObserver -- not implemented in jsdom. Mocked the same way
// carousel.test.tsx does: the fake api object must be a stable module-level
// reference, not created fresh inside the factory, or Carousel's
// `useEffect(..., [emblaApi])` re-fires every render and loops forever
// (each new object identity looks like a change, and the effect itself
// calls setState) -- see #113's PR description for how that was found.
const mockEmblaApi = {
  scrollPrev: jest.fn(),
  scrollNext: jest.fn(),
  scrollTo: jest.fn(),
  scrollSnapList: jest.fn(() => []),
  selectedScrollSnap: jest.fn(() => 0),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: () => [jest.fn(), mockEmblaApi],
}));

jest.mock('embla-carousel-autoplay', () => ({
  __esModule: true,
  default: () => ({ stop: jest.fn(), play: jest.fn() }),
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
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
