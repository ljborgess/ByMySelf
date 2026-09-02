import type { PublicProject } from '@portfolio/shared';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { ProjectDetail } from './project-detail';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn(() => ({
      revert: jest.fn(),
      from: jest.fn().mockReturnThis(),
    })),
  },
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function project(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    id: overrides.id ?? '1',
    slug: overrides.slug ?? 'projeto',
    title: overrides.title ?? 'Projeto',
    description: overrides.description ?? 'Descrição do projeto.',
    content: overrides.content ?? '# Título\n\nTexto em markdown.',
    techStack: overrides.techStack ?? [],
    repoUrl: overrides.repoUrl ?? null,
    demoUrl: overrides.demoUrl ?? null,
    coverImageUrl: overrides.coverImageUrl ?? null,
    status: overrides.status ?? 'completed',
    featured: overrides.featured ?? false,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
  };
}

function renderDetail(entry: PublicProject) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <ProjectDetail project={entry} />
    </NextIntlClientProvider>,
  );
}

describe('ProjectDetail', () => {
  it('renders title, description, tech stack and markdown content', () => {
    renderDetail(
      project({
        title: 'ByMySelf',
        description: 'Portfólio pessoal.',
        techStack: ['NestJS', 'Next.js'],
        content: '# Sobre\n\nUm case de estudo.',
      }),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'ByMySelf' }),
    ).toBeVisible();
    expect(screen.getByText('Portfólio pessoal.')).toBeVisible();
    expect(screen.getByText('NestJS')).toBeVisible();
    expect(screen.getByText('Next.js')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sobre' }),
    ).toBeVisible();
    expect(screen.getByText('Um case de estudo.')).toBeVisible();
  });

  it('renders the markdown content formatted, not as raw text', () => {
    renderDetail(
      project({
        content: '- primeiro\n- segundo',
      }),
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('primeiro')).toBeVisible();
  });

  it('shows the featured badge only when the project is featured', () => {
    renderDetail(project({ featured: true }));
    expect(screen.getByText(messages.projects.featured)).toBeVisible();
  });

  it('does not show the featured badge on a regular project', () => {
    renderDetail(project({ featured: false }));
    expect(
      screen.queryByText(messages.projects.featured),
    ).not.toBeInTheDocument();
  });

  describe('repository and demo links', () => {
    it('links to both when both are present', () => {
      renderDetail(
        project({
          repoUrl: 'https://github.com/exemplo/repo',
          demoUrl: 'https://exemplo.com/demo',
        }),
      );

      const repoLink = screen.getByRole('link', {
        name: new RegExp(messages.projectDetail.repo),
      });
      const demoLink = screen.getByRole('link', {
        name: new RegExp(messages.projectDetail.demo),
      });

      expect(repoLink).toHaveAttribute(
        'href',
        'https://github.com/exemplo/repo',
      );
      expect(repoLink).toHaveAttribute('target', '_blank');
      expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(demoLink).toHaveAttribute('href', 'https://exemplo.com/demo');
    });

    it('renders no dead link when a URL is absent', () => {
      renderDetail(project({ repoUrl: null, demoUrl: null }));

      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.projectDetail.repo),
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.projectDetail.demo),
        }),
      ).not.toBeInTheDocument();
    });

    it('renders only the link that has a URL', () => {
      renderDetail(
        project({
          repoUrl: 'https://github.com/exemplo/repo',
          demoUrl: null,
        }),
      );

      expect(
        screen.getByRole('link', {
          name: new RegExp(messages.projectDetail.repo),
        }),
      ).toBeVisible();
      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.projectDetail.demo),
        }),
      ).not.toBeInTheDocument();
    });
  });
});
