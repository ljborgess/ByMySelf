import { act, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RotatingHeadline } from './rotating-headline';

const MESSAGES = ['Primeira frase', 'Segunda frase', 'Terceira frase'];

/** One full step: the hold plus the crossfade that follows it. */
const STEP_MS = 3700;

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches });
}

/**
 * The rotating half only. Queries have to be scoped to it because the
 * sr-only copy repeats the first message verbatim -- an unscoped
 * getByText would match both and throw.
 */
function rotator() {
  return document.querySelector<HTMLElement>('[aria-hidden="true"]')!;
}

/** The rendered opacity of a message, which is what "visible" means here. */
function opacityOf(text: string) {
  return within(rotator()).getByText(text).style.opacity;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion(false);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('RotatingHeadline', () => {
  it('renders nothing when given no messages', () => {
    const { container } = render(<RotatingHeadline messages={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps every message mounted, so the box never resizes mid-rotation', () => {
    render(<RotatingHeadline messages={MESSAGES} />);

    // all present at once: the grid cell they share is what fixes the
    // height to the tallest message
    for (const message of MESSAGES) {
      expect(within(rotator()).getByText(message)).toBeInTheDocument();
    }
  });

  it('shows only the first message to begin with', () => {
    render(<RotatingHeadline messages={MESSAGES} />);

    expect(opacityOf('Primeira frase')).toBe('1');
    expect(opacityOf('Segunda frase')).toBe('0');
    expect(opacityOf('Terceira frase')).toBe('0');
  });

  it('advances to the next message on its own', () => {
    render(<RotatingHeadline messages={MESSAGES} />);

    act(() => {
      jest.advanceTimersByTime(STEP_MS);
    });

    expect(opacityOf('Segunda frase')).toBe('1');
    expect(opacityOf('Primeira frase')).toBe('0');
  });

  it('wraps back round to the first message after the last', () => {
    render(<RotatingHeadline messages={MESSAGES} />);

    act(() => {
      jest.advanceTimersByTime(STEP_MS * MESSAGES.length);
    });

    expect(opacityOf('Primeira frase')).toBe('1');
  });

  it('stays on the first message under prefers-reduced-motion', () => {
    mockReducedMotion(true);

    render(<RotatingHeadline messages={MESSAGES} />);

    act(() => {
      jest.advanceTimersByTime(STEP_MS * 3);
    });

    // stopped outright rather than merely slowed: the point of the
    // preference is no autonomous movement at all
    expect(opacityOf('Primeira frase')).toBe('1');
    expect(opacityOf('Segunda frase')).toBe('0');
  });

  it('does not start a timer for a single message', () => {
    render(<RotatingHeadline messages={['Só uma']} />);

    act(() => {
      jest.advanceTimersByTime(STEP_MS * 3);
    });

    expect(opacityOf('Só uma')).toBe('1');
  });

  it('pauses while the pointer rests on it', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RotatingHeadline messages={MESSAGES} />);

    await user.hover(rotator());
    act(() => {
      jest.advanceTimersByTime(STEP_MS * 2);
    });

    expect(opacityOf('Primeira frase')).toBe('1');
  });

  it('resumes once the pointer leaves', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RotatingHeadline messages={MESSAGES} />);

    await user.hover(rotator());
    await user.unhover(rotator());
    act(() => {
      jest.advanceTimersByTime(STEP_MS);
    });

    expect(opacityOf('Segunda frase')).toBe('1');
  });

  describe('assistive tech', () => {
    it('exposes the first message as stable text, not the rotation', () => {
      const { container } = render(<RotatingHeadline messages={MESSAGES} />);

      // the rotating part is hidden so the region does not re-announce
      // itself every few seconds
      expect(
        container.querySelector('[aria-hidden="true"]'),
      ).toBeInTheDocument();
      expect(container.querySelector('.sr-only')).toHaveTextContent(
        'Primeira frase',
      );
    });
  });
});
