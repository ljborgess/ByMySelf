'use client';

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

const AUTOPLAY_DELAY_MS = 5000;

/**
 * Headless carousel over embla-carousel-react (docs/design-aurora-futurista.md
 * -- hand-rolling accessible drag + keyboard + autoplay-pause was judged too
 * risky to get right by hand). Generic over the item type: knows nothing
 * about "project", reused by the home preview (#113) and /projetos (#114).
 *
 * Autoplay pauses on hover and on keyboard focus (embla-carousel-autoplay's
 * `stopOnMouseEnter`/`stopOnFocusIn` -- WCAG 2.2.2 Pause, Stop, Hide) and
 * stops entirely under `prefers-reduced-motion`, not just slows down.
 */
export function Carousel<T>({
  items,
  getKey,
  renderItem,
  ariaLabel,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  ariaLabel: string;
}) {
  const t = useTranslations('carousel');

  // Lazy state initializer, not `useRef(Autoplay(...))`: a ref's initial
  // value argument is still evaluated on every render (React only discards
  // it after the first), which would construct and immediately throw away
  // a plugin instance each time.
  const [autoplay] = useState(() =>
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    // Gated on emblaApi: embla-carousel-autoplay only has a working
    // internal engine once embla has finished attaching it, and emblaApi
    // existing is what confirms that happened.
    if (!emblaApi) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // No initial autoplay.play() call here, on purpose: the plugin already
    // autoplays as soon as embla finishes initializing (that is its
    // documented default), and calling .play() ourselves this early races
    // that same initialization -- embla has attached the plugin
    // (emblaApi exists) but not yet measured/registered slides, so the
    // plugin's internal timer setup throws ("Cannot read properties of
    // undefined (reading '0')") reaching into state that is not there yet.
    // Caught running the real dev server, not by the mocked-Autoplay unit
    // tests (see #115's PR). Only .stop() needs an immediate call, to
    // cancel that autostart if the preference is already active.
    if (mediaQuery.matches) {
      autoplay.stop();
    }

    // The listener only matters for a *later* toggle while the page is
    // open, well after mount -- by then the race above cannot happen, so
    // calling .play() here is safe.
    const applyMotionPreference = () => {
      if (mediaQuery.matches) {
        autoplay.stop();
      } else {
        autoplay.play();
      }
    };

    mediaQuery.addEventListener('change', applyMotionPreference);
    return () =>
      mediaQuery.removeEventListener('change', applyMotionPreference);
  }, [emblaApi, autoplay]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    // emblaApi only exists once embla has already measured and mounted, so
    // its current snap list/selection is available synchronously here --
    // this is the one read of it, not a loop: 'select'/'reInit' below are
    // what keep state in sync with every *subsequent* embla-driven change.
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  // Empty state is the caller's problem (e.g. "no featured projects yet"),
  // not this component's -- it only renders once there is something to show.
  if (items.length === 0) {
    return null;
  }

  return (
    // role="group" + aria-roledescription="carousel" is the W3C ARIA
    // Authoring Practices carousel pattern, not a substitute for a native
    // element -- there is no native element for "carousel".
    <div role="group" aria-roledescription="carousel" aria-label={ariaLabel}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex">
          {items.map((item) => (
            <div
              key={getKey(item)}
              className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {scrollSnaps.map((snap, index) => (
              <button
                key={snap}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={t('goToSlide', { position: index + 1 })}
                aria-current={index === selectedIndex}
                className={`size-2 rounded-full transition-colors ${
                  index === selectedIndex ? 'bg-accent' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label={t('previous')}
              className="hover:border-accent hover:text-accent rounded-full border border-white/20 p-2 text-sm transition-colors"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label={t('next')}
              className="hover:border-accent hover:text-accent rounded-full border border-white/20 p-2 text-sm transition-colors"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
