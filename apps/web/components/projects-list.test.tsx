import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PinnedRepo } from '@portfolio/shared';
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

function repo(overrides: Partial<PinnedRepo> = {}): PinnedRepo {
  return {
    name: overrides.name ?? 'projeto',
    description: overrides.description ?? 'Descrição do projeto.',
    url: overrides.url ?? 'https://github.com/ljborgess/projeto',
    homepageUrl: overrides.homepageUrl ?? null,
    imageUrl:
      overrides.imageUrl ??
      'https://opengraph.githubassets.com/1/ljborgess/projeto',
    techStack: overrides.techStack ?? [],
  };
}

function renderList(projects: PinnedRepo[], failed = false) {
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

  it('renders one card per pinned repo, in the order given', () => {
    renderList([
      repo({ name: 'Primeiro', url: 'https://github.com/ljborgess/primeiro' }),
      repo({ name: 'Segundo', url: 'https://github.com/ljborgess/segundo' }),
    ]);

    expect(screen.getByText('Primeiro')).toBeVisible();
    expect(screen.getByText('Segundo')).toBeVisible();
  });

  it('shows name, description and tech stack on each card', () => {
    renderList([
      repo({
        name: 'ByMySelf',
        description: 'Portfólio pessoal.',
        techStack: ['NestJS', 'Next.js'],
      }),
    ]);

    expect(screen.getByText('ByMySelf')).toBeVisible();
    expect(screen.getByText('Portfólio pessoal.')).toBeVisible();
    expect(screen.getByText('NestJS')).toBeVisible();
    expect(screen.getByText('Next.js')).toBeVisible();
  });

  it('links to the repo as the code link', () => {
    renderList([
      repo({ name: 'ByMySelf', url: 'https://github.com/ljborgess/bymyself' }),
    ]);

    const link = screen.getByRole('link', {
      name: new RegExp(messages.projects.code),
    });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/ljborgess/bymyself',
    );
  });

  it('links to the demo when homepageUrl is set', () => {
    renderList([repo({ homepageUrl: 'https://bymyself.com.br' })]);

    const link = screen.getByRole('link', {
      name: new RegExp(messages.projects.demo),
    });
    expect(link).toHaveAttribute('href', 'https://bymyself.com.br');
  });

  it('does not show a demo link when homepageUrl is absent', () => {
    renderList([repo({ homepageUrl: null })]);

    expect(
      screen.queryByRole('link', { name: new RegExp(messages.projects.demo) }),
    ).not.toBeInTheDocument();
  });

  it('says so when there are no pinned repos', () => {
    renderList([]);

    expect(screen.getByText(messages.projects.empty)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows an error message instead of the list when the fetch failed', () => {
    renderList([repo({ name: 'Não deveria aparecer' })], true);

    expect(screen.getByText(messages.projects.error)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText('Não deveria aparecer')).not.toBeInTheDocument();
  });
});
