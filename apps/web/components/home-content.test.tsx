import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import type { PublicProjectListItem } from '../lib/projects';
import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';
import messages from '../messages/pt.json';
import { HomeContent } from './home-content';

const mockProfile = makeProfile({
  name: 'Nome Sobrenome',
  headline: 'Headline de teste',
});

// mocked so the component's own rendering is under test, not the real
// content -- otherwise every edit to profile.ts would break these assertions
jest.mock('../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

// CoreFocusSection/StatsSection render PinnedSection (GSAP/ScrollTrigger),
// IntroLoader/HeroSection build their own plain gsap.timeline() -- mocked the
// same way pinned-section.test.tsx does. set/to/from all return the
// timeline itself so chained calls (timeline.set(...).to(...)) do not throw
// on `undefined` the way the real GSAP API's chaining would not.
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => {
      const tl: Record<string, jest.Mock> = {
        kill: jest.fn(),
        revert: jest.fn(),
      };
      tl.set = jest.fn(() => tl);
      tl.to = jest.fn(() => tl);
      tl.from = jest.fn(() => tl);
      tl.scrollTrigger = { kill: jest.fn() } as unknown as jest.Mock;
      return tl;
    }),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
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
    featured: overrides.featured ?? true,
    completedAt: overrides.completedAt ?? null,
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function renderHome(
  featuredProjects: PublicProjectListItem[] = [],
  projectCount = 0,
) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HomeContent
        featuredProjects={featuredProjects}
        projectCount={projectCount}
      />
    </NextIntlClientProvider>,
  );
}

/** The four sections the hub links to -- home itself is not among them. */
const CARD_SECTIONS = NAVIGATION_SECTIONS.filter(
  (section) => section.href !== '/',
);

describe('HomeContent', () => {
  beforeEach(() => {
    mockProfile.photoUrl = null;
  });

  it('identifies whose portfolio this is, as the top-level heading', () => {
    renderHome();

    // substring, not exact: the h1 is the whole sentence (greeting + name),
    // which is what a screen reader and a crawler receive
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: new RegExp(mockProfile.name),
      }),
    ).toBeVisible();
  });

  it('shows the headline alongside the name', () => {
    renderHome();

    // getAllBy: RotatingHeadline renders the headline as both the stable
    // sr-only text and the rotation's first slide
    expect(screen.getAllByText(mockProfile.headline).length).toBeGreaterThan(0);
  });

  it('links to every section, one card each', () => {
    renderHome();

    for (const section of CARD_SECTIONS) {
      const label = messages.nav[section.messageKey];
      expect(
        screen.getByRole('link', { name: new RegExp(label) }),
      ).toBeVisible();
    }
  });

  it('does not link back to the page it is already on', () => {
    renderHome();

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).not.toContain('/pt');
  });

  it('points each card at its locale-prefixed route', () => {
    renderHome();

    // Scoped to the cards by name rather than every link on the page --
    // the hero's own CTA (also /projetos) is a legitimate extra link here,
    // not a card, and asserting on getAllByRole('link') wholesale would
    // make this test break every time an unrelated link is added anywhere
    // on the page.
    for (const section of CARD_SECTIONS) {
      const label = messages.nav[section.messageKey];
      expect(
        screen.getByRole('link', { name: new RegExp(label) }),
      ).toHaveAttribute('href', `/pt${section.href}`);
    }
  });

  it('describes each card, so the label is not the only cue', () => {
    renderHome();

    for (const section of CARD_SECTIONS) {
      expect(
        screen.getByText(messages.home.cards[section.messageKey]),
      ).toBeVisible();
    }
  });

  // No 'photo' block any more: the hero dropped the avatar (see
  // hero-section.tsx), so ProfileAvatar only renders on /sobre now, and
  // sobre/page.test.tsx is where the initials/photo fallback is covered.

  describe('featured projects', () => {
    it('renders nothing when there are no featured projects', () => {
      renderHome([]);

      expect(
        screen.queryByText(messages.home.featuredHeading),
      ).not.toBeInTheDocument();
    });

    it('shows a card per featured project, linking to its detail page', () => {
      renderHome([
        project({ id: '1', slug: 'um', title: 'Projeto Um' }),
        project({ id: '2', slug: 'dois', title: 'Projeto Dois' }),
      ]);

      expect(screen.getByText(messages.home.featuredHeading)).toBeVisible();
      expect(screen.getByRole('link', { name: /Projeto Um/ })).toHaveAttribute(
        'href',
        '/pt/projetos/um',
      );
      expect(
        screen.getByRole('link', { name: /Projeto Dois/ }),
      ).toHaveAttribute('href', '/pt/projetos/dois');
    });

    it('renders one card per featured project', () => {
      renderHome([project({ id: '1' }), project({ id: '2', slug: 'dois' })]);

      const list = screen.getByRole('list', {
        name: messages.home.featuredHeading,
      });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    });
  });
});
