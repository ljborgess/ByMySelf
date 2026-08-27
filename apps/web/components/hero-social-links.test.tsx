import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import messages from '../messages/pt.json';
import { HeroSocialLinks } from './hero-social-links';

const mockProfile = makeProfile({
  links: {
    github: 'https://github.com/exemplo',
    linkedin: 'https://www.linkedin.com/in/exemplo/',
    email: 'exemplo@dominio.com',
  },
});

jest.mock('../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

function renderLinks() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HeroSocialLinks />
    </NextIntlClientProvider>,
  );
}

const full = { links: { ...mockProfile.links } };

beforeEach(() => {
  mockProfile.links = { ...full.links };
});

describe('HeroSocialLinks', () => {
  it('points each circle at its destination', () => {
    renderLinks();

    expect(
      screen.getByRole('link', { name: messages.hero.social.github }),
    ).toHaveAttribute('href', full.links.github);
    expect(
      screen.getByRole('link', { name: messages.hero.social.linkedin }),
    ).toHaveAttribute('href', full.links.linkedin);
  });

  it('names every circle, since none of them carry visible text', () => {
    renderLinks();

    // icon-only links are unusable without an accessible name
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAccessibleName();
    }
  });

  it('opens the external profiles in a new tab, safely', () => {
    renderLinks();

    for (const name of [
      messages.hero.social.github,
      messages.hero.social.linkedin,
    ]) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      // noreferrer as well as noopener: without it the target page still
      // learns which page the visitor came from
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('leaves the CV to the hero CTA rather than duplicating the link', () => {
    mockProfile.cvUrl = '/cv-pt.pdf';

    renderLinks();

    // two adjacent controls pointing at the same PDF would show up twice in
    // a screen reader's link list; the white CTA next to these owns it
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('download');
    }
  });

  it('omits a circle with no address rather than emitting a dead one', () => {
    mockProfile.links = { ...full.links, github: null };

    renderLinks();

    expect(
      screen.queryByRole('link', { name: messages.hero.social.github }),
    ).not.toBeInTheDocument();
    // the one that does have an address survives
    expect(
      screen.getByRole('link', { name: messages.hero.social.linkedin }),
    ).toBeInTheDocument();
  });

  it('renders nothing at all when the profile has no links yet', () => {
    mockProfile.links = { github: null, linkedin: null, email: null };

    const { container } = renderLinks();

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the icons from assistive tech, leaving the label to the link', () => {
    const { container } = renderLinks();

    // an announced icon would just duplicate the aria-label
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
