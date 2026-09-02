import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import gsap from 'gsap';
import type { PublicProjectListItem } from '../lib/projects';
import messages from '../messages/pt.json';
import { FeaturedProjects } from './featured-projects';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      from: jest.fn(),
      revert: jest.fn(),
      scrollTrigger: { kill: jest.fn() },
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

const mockedGsap = gsap as unknown as {
  registerPlugin: jest.Mock;
  timeline: jest.Mock;
};

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
}

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
    featured: overrides.featured ?? true,
    completedAt: overrides.completedAt ?? null,
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function renderFeatured(projects: PublicProjectListItem[]) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <FeaturedProjects projects={projects} />
    </NextIntlClientProvider>,
  );
}

describe('FeaturedProjects', () => {
  beforeEach(() => {
    mockedGsap.timeline.mockClear();
  });

  it('renders nothing when there are no featured projects', () => {
    mockMatchMedia(false);
    renderFeatured([]);

    expect(
      screen.queryByText(messages.home.featuredHeading),
    ).not.toBeInTheDocument();
  });

  it('renders one card per featured project', () => {
    mockMatchMedia(false);
    renderFeatured([project({ id: '1' }), project({ id: '2', slug: 'dois' })]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('does not set up a reveal timeline when there is nothing to reveal', () => {
    mockMatchMedia(false);
    renderFeatured([]);

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('does not set up a reveal timeline under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    renderFeatured([project()]);

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('kills the ScrollTrigger and reverts the timeline on unmount', () => {
    mockMatchMedia(false);
    const { unmount } = renderFeatured([project()]);

    const timelineInstance = mockedGsap.timeline.mock.results[0].value as {
      scrollTrigger: { kill: jest.Mock };
      revert: jest.Mock;
    };

    unmount();

    expect(timelineInstance.scrollTrigger.kill).toHaveBeenCalled();
    // .revert(), not .kill() (#135): killing a .from()-based tween leaves
    // its starting values as frozen inline styles, which corrupts a second
    // mount under React 18 Strict Mode's double-invoke.
    expect(timelineInstance.revert).toHaveBeenCalled();
  });
});
