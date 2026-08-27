import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import gsap from 'gsap';
import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';
import messages from '../messages/pt.json';
import { SectionCards } from './section-cards';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      from: jest.fn(),
      kill: jest.fn(),
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

function renderCards() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <SectionCards />
    </NextIntlClientProvider>,
  );
}

/** Home itself is excluded -- linking the page you are already on is noise. */
const CARD_SECTIONS = NAVIGATION_SECTIONS.filter(
  (section) => section.href !== '/',
);

describe('SectionCards', () => {
  beforeEach(() => {
    mockedGsap.timeline.mockClear();
  });

  it('renders one card per section, home excluded', () => {
    mockMatchMedia(false);
    renderCards();

    for (const section of CARD_SECTIONS) {
      const label = messages.nav[section.messageKey];
      expect(
        screen.getByRole('link', { name: new RegExp(label) }),
      ).toBeVisible();
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(CARD_SECTIONS.length);
  });

  it('registers the ScrollTrigger plugin at module load', () => {
    mockMatchMedia(false);
    renderCards();

    expect(mockedGsap.registerPlugin).toHaveBeenCalledWith(expect.anything());
  });

  it('does not set up a reveal timeline under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    renderCards();

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('kills the reveal timeline and its ScrollTrigger on unmount', () => {
    mockMatchMedia(false);
    const { unmount } = renderCards();

    const timelineInstance = mockedGsap.timeline.mock.results[0].value as {
      scrollTrigger: { kill: jest.Mock };
      kill: jest.Mock;
    };

    unmount();

    expect(timelineInstance.scrollTrigger.kill).toHaveBeenCalled();
    expect(timelineInstance.kill).toHaveBeenCalled();
  });
});
