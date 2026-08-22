import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../../../content/profile.fixture';
import { NAVIGATION_SECTIONS } from '../../../lib/navigation-sections';
import messages from '../../../messages/pt.json';

const mockProfile = makeProfile({
  name: 'Nome Sobrenome',
  headline: 'Headline de teste',
});

// mocked so the page's own rendering is under test, not the real content --
// otherwise every edit to profile.ts would break these assertions
jest.mock('../../../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomePage = require('./page').default as () => React.ReactElement;

function renderHome() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HomePage />
    </NextIntlClientProvider>,
  );
}

/** The four sections the hub links to -- home itself is not among them. */
const CARD_SECTIONS = NAVIGATION_SECTIONS.filter(
  (section) => section.href !== '/',
);

describe('HomePage', () => {
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
});
