import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import gsap from 'gsap';
import type { PinnedRepo } from '../lib/projects';
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

function repo(overrides: Partial<PinnedRepo> = {}): PinnedRepo {
  return {
    name: overrides.name ?? 'Projeto',
    description: overrides.description ?? 'Descrição do projeto.',
    url: overrides.url ?? 'https://github.com/ljborgess/projeto',
    homepageUrl: overrides.homepageUrl ?? null,
    imageUrl:
      overrides.imageUrl ??
      'https://opengraph.githubassets.com/1/ljborgess/projeto',
    techStack: overrides.techStack ?? [],
  };
}

function renderFeatured(projects: PinnedRepo[]) {
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

  it('renders nothing when there are no pinned repos', () => {
    mockMatchMedia(false);
    renderFeatured([]);

    expect(
      screen.queryByText(messages.home.featuredHeading),
    ).not.toBeInTheDocument();
  });

  it('renders one card per pinned repo', () => {
    mockMatchMedia(false);
    renderFeatured([
      repo({ url: 'https://github.com/ljborgess/um' }),
      repo({ url: 'https://github.com/ljborgess/dois' }),
    ]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('links each card to the repo on GitHub', () => {
    mockMatchMedia(false);
    renderFeatured([repo({ url: 'https://github.com/ljborgess/bymyself' })]);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/ljborgess/bymyself',
    );
  });

  it('does not set up a reveal timeline when there is nothing to reveal', () => {
    mockMatchMedia(false);
    renderFeatured([]);

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('does not set up a reveal timeline under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    renderFeatured([repo()]);

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('kills the ScrollTrigger and reverts the timeline on unmount', () => {
    mockMatchMedia(false);
    const { unmount } = renderFeatured([repo()]);

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
