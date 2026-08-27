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
      const tl: { to: jest.Mock; kill: jest.Mock } = {
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
    capturedOnComplete = undefined;
  });

  it('shows the greeting cycle, ending on the real site greeting', () => {
    mockMatchMedia(false);
    const { getByText } = renderIntro();

    expect(getByText('Hello')).toBeInTheDocument();
    expect(getByText(messages.intro.greeting)).toBeInTheDocument();
  });

  it('shows again on every render -- no "already seen" gate', () => {
    mockMatchMedia(false);
    const first = renderIntro();
    expect(first.getByText(messages.intro.greeting)).toBeInTheDocument();
    first.unmount();

    const second = renderIntro();
    expect(second.getByText(messages.intro.greeting)).toBeInTheDocument();
  });

  it('skips straight to hidden under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    const { queryByText } = renderIntro();

    expect(queryByText(messages.intro.greeting)).not.toBeInTheDocument();
  });

  it('hides itself once the greeting cycle completes', () => {
    mockMatchMedia(false);
    const { getByText, queryByText } = renderIntro();

    expect(getByText(messages.intro.greeting)).toBeInTheDocument();

    act(() => {
      capturedOnComplete?.();
    });

    expect(queryByText(messages.intro.greeting)).not.toBeInTheDocument();
  });

  it('is hidden from the accessibility tree -- decorative, must not block screen readers', () => {
    mockMatchMedia(false);
    const { container } = renderIntro();

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
