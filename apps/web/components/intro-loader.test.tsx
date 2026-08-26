import { act, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { IntroLoader } from './intro-loader';

let capturedOnComplete: (() => void) | undefined;

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn((config: { onComplete?: () => void }) => {
      capturedOnComplete = config?.onComplete;
      const tl: { set: jest.Mock; to: jest.Mock; kill: jest.Mock } = {
        set: jest.fn(() => tl),
        to: jest.fn(() => tl),
        kill: jest.fn(),
      };
      return tl;
    }),
  },
}));

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
}

function renderIntro() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <IntroLoader />
    </NextIntlClientProvider>,
  );
}

describe('IntroLoader', () => {
  beforeEach(() => {
    sessionStorage.clear();
    capturedOnComplete = undefined;
  });

  it('shows the greeting on a first visit', () => {
    mockMatchMedia(false);
    const { getByText } = renderIntro();

    expect(getByText(messages.intro.greeting)).toBeInTheDocument();
  });

  it('does not show again in the same session once already seen', () => {
    sessionStorage.setItem('portfolio-intro-seen', 'true');
    mockMatchMedia(false);
    const { queryByText } = renderIntro();

    expect(queryByText(messages.intro.greeting)).not.toBeInTheDocument();
  });

  it('skips straight to hidden under prefers-reduced-motion, even on a first visit', () => {
    mockMatchMedia(true);
    const { queryByText } = renderIntro();

    expect(queryByText(messages.intro.greeting)).not.toBeInTheDocument();
  });

  it('marks the session as seen and hides itself once the draw animation completes', () => {
    mockMatchMedia(false);
    const { getByText, queryByText } = renderIntro();

    expect(getByText(messages.intro.greeting)).toBeInTheDocument();

    act(() => {
      capturedOnComplete?.();
    });

    expect(sessionStorage.getItem('portfolio-intro-seen')).toBe('true');
    expect(queryByText(messages.intro.greeting)).not.toBeInTheDocument();
  });

  it('is hidden from the accessibility tree -- decorative, must not block screen readers', () => {
    mockMatchMedia(false);
    const { container } = renderIntro();

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
