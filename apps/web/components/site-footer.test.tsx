import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import messages from '../messages/pt.json';
import { SiteFooter } from './site-footer';

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

function renderFooter() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <SiteFooter />
    </NextIntlClientProvider>,
  );
}

const fullLinks = { ...mockProfile.links };

describe('SiteFooter', () => {
  beforeEach(() => {
    mockProfile.links = { ...fullLinks };
  });

  it('renders as a footer landmark', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('shows the current year alongside the site owner', () => {
    renderFooter();

    expect(
      screen.getByText(new RegExp(String(new Date().getFullYear()))),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockProfile.name))).toBeInTheDocument();
  });

  it('opens the profile links in a new tab, safely', () => {
    renderFooter();

    for (const key of ['github', 'linkedin'] as const) {
      const link = screen.getByRole('link', {
        name: messages.footer.links[key],
      });

      expect(link).toHaveAttribute('href', fullLinks[key]);
      expect(link).toHaveAttribute('target', '_blank');
      // noreferrer as well as noopener: without it the target page still
      // learns which page the visitor came from
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('renders the email as a mailto, without a new tab', () => {
    renderFooter();

    const link = screen.getByRole('link', {
      name: messages.footer.links.email,
    });

    expect(link).toHaveAttribute('href', `mailto:${fullLinks.email}`);
    // a mail client opening in a browser tab is meaningless
    expect(link).not.toHaveAttribute('target');
  });

  it('omits a link that has no address rather than emitting a dead one', () => {
    mockProfile.links = { github: null, linkedin: null, email: null };

    renderFooter();

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    // the owner line must survive on its own
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('keeps the links it does have when others are missing', () => {
    mockProfile.links = { ...fullLinks, email: null };

    renderFooter();

    expect(screen.queryAllByRole('link')).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: messages.footer.links.email }),
    ).not.toBeInTheDocument();
  });
});
