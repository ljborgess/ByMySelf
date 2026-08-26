'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Reusable pin/scroll-jacking wrapper (docs/design-clone-syahril.md) --
 * used by #128 (Quote) and #129 (Stats), built once here instead of
 * duplicated in both. Draws the reference's repeated frame (thin red
 * border + 4 corner markers) and pins the section via ScrollTrigger while
 * `onSetup` populates the scroll-scrubbed timeline.
 *
 * `prefers-reduced-motion` disables the pin *entirely*, not just the
 * internal animation -- leaving the pin active with nothing animating
 * would trap the visitor's scroll for no visible reason, which is worse
 * than not pinning at all.
 *
 * Cleanup on unmount is not optional: the App Router unmounts this on
 * route change without a full page reload, so an un-killed ScrollTrigger
 * instance leaks into whatever page loads next.
 */
export function PinnedFrameSection({
  children,
  onSetup,
  pinSpacing = true,
  scrollDistance = '+=100%',
  className = '',
}: {
  children: ReactNode;
  onSetup?: (timeline: gsap.core.Timeline, container: HTMLDivElement) => void;
  pinSpacing?: boolean;
  scrollDistance?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: scrollDistance,
        pin: true,
        pinSpacing,
        scrub: 1,
      },
    });

    onSetup?.(timeline, container);

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
    // onSetup deliberately left out of the deps array: it is expected to
    // be a stable function per call site (defined once per section, not
    // recreated every render), and including it would tear down and
    // rebuild the pin on every render where the caller re-creates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSpacing, scrollDistance]);

  return (
    <div
      ref={containerRef}
      className={`border-highlight-red relative border ${className}`}
    >
      <span
        aria-hidden="true"
        className="bg-highlight-red absolute -top-[3px] -left-[3px] size-1.5"
      />
      <span
        aria-hidden="true"
        className="bg-highlight-red absolute -top-[3px] -right-[3px] size-1.5"
      />
      <span
        aria-hidden="true"
        className="bg-highlight-red absolute -bottom-[3px] -left-[3px] size-1.5"
      />
      <span
        aria-hidden="true"
        className="bg-highlight-red absolute -bottom-[3px] -right-[3px] size-1.5"
      />
      {children}
    </div>
  );
}
