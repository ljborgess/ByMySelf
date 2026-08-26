import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { Carousel } from './carousel';

/**
 * embla-carousel-react drives real DOM measurement (ResizeObserver, scroll)
 * that jsdom does not implement -- mocked the same way the project mocks
 * other heavy externals (e.g. `content/profile` in site-footer.test.tsx),
 * with a shared fake api object so assertions can inspect what the
 * component called on it.
 */
const mockEmblaApi = {
  scrollPrev: jest.fn(),
  scrollNext: jest.fn(),
  scrollTo: jest.fn(),
  scrollSnapList: jest.fn(() => [0, 1, 2]),
  selectedScrollSnap: jest.fn(() => 0),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: () => [jest.fn(), mockEmblaApi],
}));

const mockAutoplay = { stop: jest.fn(), play: jest.fn() };

jest.mock('embla-carousel-autoplay', () => ({
  __esModule: true,
  default: () => mockAutoplay,
}));

function mockMatchMedia(reducedMotion: boolean) {
  const listeners: (() => void)[] = [];
  window.matchMedia = jest.fn().mockReturnValue({
    matches: reducedMotion,
    addEventListener: (_event: string, listener: () => void) => {
      listeners.push(listener);
    },
    removeEventListener: jest.fn(),
  });
  return listeners;
}

const items = [
  { id: '1', label: 'Um' },
  { id: '2', label: 'Dois' },
  { id: '3', label: 'Três' },
];

function renderCarousel(list = items) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <Carousel
        items={list}
        getKey={(item) => item.id}
        renderItem={(item) => <p>{item.label}</p>}
        ariaLabel="Projetos"
      />
    </NextIntlClientProvider>,
  );
}

describe('Carousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false);
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <Carousel
          items={[]}
          getKey={(item: { id: string }) => item.id}
          renderItem={() => null}
          ariaLabel="Projetos"
        />
      </NextIntlClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders every item via renderItem', () => {
    renderCarousel();

    for (const item of items) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it('exposes the group as a labelled carousel landmark', () => {
    renderCarousel();

    expect(screen.getByRole('group', { name: 'Projetos' })).toBeInTheDocument();
  });

  it('calls scrollPrev/scrollNext from the nav buttons', async () => {
    const user = userEvent.setup();
    renderCarousel();

    await user.click(screen.getByRole('button', { name: 'Slide anterior' }));
    expect(mockEmblaApi.scrollPrev).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Próximo slide' }));
    expect(mockEmblaApi.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('renders one dot per scroll snap, current one marked', () => {
    renderCarousel();

    const dots = [1, 2, 3].map((position) =>
      screen.getByRole('button', { name: `Ir para o slide ${position}` }),
    );

    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(dots[1]).toHaveAttribute('aria-current', 'false');
  });

  it('hides nav controls with a single item -- nothing to navigate to', () => {
    renderCarousel([items[0]]);

    expect(
      screen.queryByRole('button', { name: 'Slide anterior' }),
    ).not.toBeInTheDocument();
  });

  it('stops autoplay when prefers-reduced-motion is already active on mount', () => {
    mockMatchMedia(true);

    renderCarousel();

    expect(mockAutoplay.stop).toHaveBeenCalled();
    expect(mockAutoplay.play).not.toHaveBeenCalled();
  });

  it('does not call play() on mount -- the plugin already autoplays by default', () => {
    // Calling play() proactively on mount raced the plugin's own init in
    // the real embla-carousel-autoplay (fixed after being caught running
    // the real dev server, not by this suite's mocked Autoplay -- see
    // #115's PR). This test guards the fix: no preference means leaving
    // the plugin's default autostart alone, not re-triggering it.
    mockMatchMedia(false);

    renderCarousel();

    expect(mockAutoplay.play).not.toHaveBeenCalled();
    expect(mockAutoplay.stop).not.toHaveBeenCalled();
  });

  it('reacts to the preference changing later, while the page is open', () => {
    const listeners = mockMatchMedia(false);

    renderCarousel();
    listeners.forEach((listener) => listener());

    // By the time a *later* toggle fires, mount has long finished, so
    // calling play() here does not race anything -- only the live-change
    // path calls play(), never the mount path (previous test).
    expect(mockAutoplay.play).toHaveBeenCalledTimes(1);
  });
});
