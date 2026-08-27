import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import messages from '../messages/pt.json';
import { HeroSection } from './hero-section';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn(() => ({
      from: jest.fn(),
      to: jest.fn(),
      kill: jest.fn(),
      revert: jest.fn(),
    })),
  },
}));

const mockProfile = makeProfile({
  name: 'Fulana Exemplo',
  headline: 'Desenvolvedora Full-Stack',
  cvUrl: '/cv-pt.pdf',
});

const publishedCvUrl = mockProfile.cvUrl;

beforeEach(() => {
  mockProfile.cvUrl = publishedCvUrl;
});

jest.mock('../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
}

function renderHero() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HeroSection />
    </NextIntlClientProvider>,
  );
}

describe('HeroSection', () => {
  it('renders the name and headline regardless of the motion preference', () => {
    mockMatchMedia(true);
    renderHero();

    // substring, not exact: the h1 is the whole sentence (greeting + name),
    // which is what a screen reader and a crawler receive
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: new RegExp(mockProfile.name),
      }),
    ).toBeVisible();
    // twice over, by design: RotatingHeadline renders the headline both as
    // the stable sr-only text and as the first slide of the rotation, so
    // it survives whether or not the rotation ever runs
    expect(screen.getAllByText(mockProfile.headline).length).toBeGreaterThan(0);
  });

  it('makes the primary CTA download the CV', () => {
    mockMatchMedia(false);
    renderHero();

    const cta = screen.getByRole('link', { name: messages.hero.cta });

    expect(cta).toHaveAttribute('href', publishedCvUrl);
    // <a download>, not a router Link: the target is a static file in
    // public/, and the browser owns the save dialog
    expect(cta).toHaveAttribute('download');
    expect(cta).not.toHaveAttribute('target');
  });

  it('falls back to the projects route while no CV is published', () => {
    mockProfile.cvUrl = null;
    mockMatchMedia(false);
    renderHero();

    // no dead download link...
    expect(
      screen.queryByRole('link', { name: messages.hero.cta }),
    ).not.toBeInTheDocument();
    // ...but the hero still has a primary action
    expect(
      screen.getByRole('link', { name: messages.hero.ctaProjects }),
    ).toHaveAttribute('href', '/pt/projetos');
  });

  it('scrolls down (instantly, under reduced motion) when the arrow button is clicked', async () => {
    mockMatchMedia(true);
    window.scrollBy = jest.fn();
    const user = userEvent.setup();
    renderHero();

    await user.click(
      screen.getByRole('button', { name: messages.hero.scrollHint }),
    );

    expect(window.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
  });

  it('scrolls smoothly when the arrow button is clicked without the preference', async () => {
    mockMatchMedia(false);
    window.scrollBy = jest.fn();
    const user = userEvent.setup();
    renderHero();

    await user.click(
      screen.getByRole('button', { name: messages.hero.scrollHint }),
    );

    expect(window.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });
});
