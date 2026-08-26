import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  window.scrollTo = jest.fn();
});

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
    mockProfile.cvUrl = null;
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

  describe('CTA', () => {
    it('shows the "Hire Me" button as a mailto, matching the profile email', () => {
      renderFooter();

      const link = screen.getByRole('link', {
        name: new RegExp(messages.footer.cta.hireMe),
      });

      expect(link).toHaveAttribute('href', `mailto:${fullLinks.email}`);
    });

    it('omits the "Hire Me" button when there is no email', () => {
      mockProfile.links = { ...fullLinks, email: null };

      renderFooter();

      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.footer.cta.hireMe),
        }),
      ).not.toBeInTheDocument();
    });

    it('shows the CV button when a CV is set', () => {
      mockProfile.cvUrl = '/cv-pt.pdf';

      renderFooter();

      expect(
        screen.getByRole('link', {
          name: new RegExp(messages.about.downloadCv),
        }),
      ).toHaveAttribute('href', '/cv-pt.pdf');
    });

    it('omits the CV button while there is no CV', () => {
      renderFooter();

      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.about.downloadCv),
        }),
      ).not.toBeInTheDocument();
    });
  });

  it('scrolls back to the top when the button is clicked', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(
      screen.getByRole('button', { name: messages.footer.backToTop }),
    );

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 }),
    );
  });
});
