import { render, screen, waitFor } from '@testing-library/react';
import { ScrollProgress } from './scroll-progress';

/**
 * jsdom has no layout, so scroll geometry has to be stated outright:
 * scrollHeight/innerHeight/scrollY are what the component divides to get
 * progress, and getBoundingClientRect is what it reads to pick the label.
 */
function setGeometry({
  scrollY = 0,
  innerHeight = 800,
  scrollHeight = 2400,
}: {
  scrollY?: number;
  innerHeight?: number;
  scrollHeight?: number;
} = {}) {
  Object.defineProperty(window, 'scrollY', { value: scrollY, writable: true });
  Object.defineProperty(window, 'innerHeight', {
    value: innerHeight,
    writable: true,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    writable: true,
  });
}

/** The filled part of the track -- the only element sized by progress. */
function fillWidth(container: HTMLElement) {
  return container.querySelector<HTMLElement>('.bg-highlight-red')?.style
    .height;
}

function addSection(label: string, top: number) {
  const section = document.createElement('div');
  section.dataset.sectionLabel = label;
  section.getBoundingClientRect = () => ({ top }) as DOMRect;
  document.body.appendChild(section);
  return section;
}

beforeEach(() => {
  document.body.innerHTML = '';
  setGeometry();
});

describe('ScrollProgress', () => {
  it('is hidden from assistive tech, duplicating the native scrollbar', () => {
    const { container } = render(<ScrollProgress />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('shows no fill at the top of the page', () => {
    const { container } = render(<ScrollProgress />);

    expect(fillWidth(container)).toBe('0%');
  });

  it('fills proportionally to how far the page is scrolled', () => {
    // 800 of 1600 scrollable pixels == halfway
    setGeometry({ scrollY: 800, innerHeight: 800, scrollHeight: 2400 });

    const { container } = render(<ScrollProgress />);

    expect(fillWidth(container)).toBe('50%');
  });

  it('clamps to 100% rather than overshooting past the end', () => {
    // browsers report scrollY beyond the maximum during overscroll/bounce
    setGeometry({ scrollY: 5000, innerHeight: 800, scrollHeight: 2400 });

    const { container } = render(<ScrollProgress />);

    expect(fillWidth(container)).toBe('100%');
  });

  it('stays at zero on a page too short to scroll, instead of dividing by zero', () => {
    setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 800 });

    const { container } = render(<ScrollProgress />);

    expect(fillWidth(container)).toBe('0%');
  });

  it('renders no label on a page with no marked sections', () => {
    render(<ScrollProgress />);

    // pages other than the home page are running prose -- a label there
    // would just repeat the page title already on screen
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });

  it('labels the last section whose top has passed the middle of the viewport', () => {
    addSection('Início', -500);
    addSection('Foco', 200); // above the 400px midpoint -> current
    addSection('Números', 900); // still below the fold

    render(<ScrollProgress />);

    expect(screen.getByText('Foco')).toBeInTheDocument();
    expect(screen.queryByText('Números')).not.toBeInTheDocument();
  });

  it('keeps the first section labelled until the next one reaches the middle', () => {
    addSection('Início', -100);
    addSection('Foco', 600); // below the 400px midpoint -> not yet current

    render(<ScrollProgress />);

    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('updates as the page scrolls', async () => {
    const { container } = render(<ScrollProgress />);
    expect(fillWidth(container)).toBe('0%');

    setGeometry({ scrollY: 1600, innerHeight: 800, scrollHeight: 2400 });
    window.dispatchEvent(new Event('scroll'));

    // awaited rather than asserted straight away: scroll events are
    // coalesced into a requestAnimationFrame, so the update lands a frame
    // after the event rather than synchronously with it
    await waitFor(() => {
      expect(fillWidth(container)).toBe('100%');
    });
  });

  it('stops listening once unmounted, so a route change leaks no handler', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<ScrollProgress />);
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    removeSpy.mockRestore();
  });
});
