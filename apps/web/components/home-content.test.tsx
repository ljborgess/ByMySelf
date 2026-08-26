import { render, screen } from '@testing-library/react';
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

// The featured-projects carousel renders Carousel (embla-carousel-react),
// which needs ResizeObserver -- not implemented in jsdom. Mocked the same
// way carousel.test.tsx does -- the fake api object has to be a stable
// module-level reference, not created fresh inside the factory: Carousel's
// effect depends on `[emblaApi]`, so a new object identity every render
// re-triggers it every render, which loops forever ("Maximum update depth
// exceeded") since the effect itself calls setState.
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
    featured: overrides.featured ?? true,
    completedAt: overrides.completedAt ?? null,
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function renderHome(featuredProjects: PublicProjectListItem[] = []) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HomeContent featuredProjects={featuredProjects} />
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

    expect(
      screen.getByRole('heading', { level: 1, name: mockProfile.name }),
    ).toBeVisible();
  });

  it('shows the headline alongside the name', () => {
    renderHome();

    expect(screen.getByText(mockProfile.headline)).toBeVisible();
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

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual([
      '/pt/sobre',
      '/pt/formacao',
      '/pt/certificados',
      '/pt/projetos',
    ]);
  });

  it('describes each card, so the label is not the only cue', () => {
    renderHome();

    for (const section of CARD_SECTIONS) {
      expect(
        screen.getByText(messages.home.cards[section.messageKey]),
      ).toBeVisible();
    }
  });

  describe('photo', () => {
    it('falls back to initials when there is no photo', () => {
      renderHome();

      // a broken image or empty box would be worse than no photo at all
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('NS')).toBeInTheDocument();
    });

    it('renders the photo when one is set, labelled with the name', () => {
      mockProfile.photoUrl = 'https://example.com/foto.jpg';

      renderHome();

      expect(
        screen.getByRole('img', { name: mockProfile.name }),
      ).toBeInTheDocument();
    });
  });

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

    it('exposes the carousel as a labelled landmark', () => {
      renderHome([project()]);

      expect(
        screen.getByRole('group', { name: messages.home.featuredHeading }),
      ).toBeInTheDocument();
    });
  });
});
