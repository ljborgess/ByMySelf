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
      kill: jest.fn(),
      revert: jest.fn(),
    })),
  },
}));

const mockProfile = makeProfile({
  name: 'Fulana Exemplo',
  headline: 'Desenvolvedora Full-Stack',
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

    expect(
      screen.getByRole('heading', { level: 1, name: mockProfile.name }),
    ).toBeVisible();
    expect(screen.getByText(mockProfile.headline)).toBeVisible();
  });

  it('links the CTA to the locale-prefixed projects route', () => {
    mockMatchMedia(false);
    renderHero();

    expect(
      screen.getByRole('link', { name: messages.hero.cta }),
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
