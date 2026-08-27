'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Reusable pin/scroll-jacking wrapper (docs/design-clone-syahril.md) --
 * used by the Quote (#128) and Stats (#129) sections, built once here
 * instead of duplicated in both. Pins the section via ScrollTrigger while
 * `onSetup` populates the scroll-scrubbed timeline.
 *
 * Draws no frame: the reference's red border and corner markers were
 * dropped by the owner's call, and the component was renamed from
 * PinnedFrameSection to match what it actually does. It is now purely a
 * pin behaviour wrapper -- all styling comes from `className`.
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
export function PinnedSection({
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

    // O header é uma ilha `fixed` (site-header.tsx): pinar em `top top`
    // encaixaria o topo da seção exatamente atrás dela. Medido do elemento
    // real em vez de repetir a constante `--header-offset` do CSS -- assim
    // mudar o tamanho da barra não deixa os dois valores divergirem em
    // silêncio.
    const header = document.querySelector('header');
    const headerClearance = header
      ? Math.round(header.getBoundingClientRect().bottom) + 12
      : 0;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: `top top+=${headerClearance}`,
        end: scrollDistance,
        pin: true,
        pinSpacing,
        scrub: 1,
      },
    });

    onSetup?.(timeline, container);

    // .revert(), not .kill(), on the timeline (#135 audit -- same fix as
    // hero-section.tsx): React 18 Strict Mode double-invokes this effect in
    // dev, and killing a .from()-based tween (CoreFocusSection/StatsSection
    // both use one in onSetup) leaves its starting values as inline styles;
    // the second mount's .from() then reads that corrupted state as the
    // "natural" end target and animates 0 -> 0 forever, reporting
    // onComplete while the content stays invisible. .revert() strips the
    // inline styles instead of freezing them.
    return () => {
      timeline.scrollTrigger?.kill();
      timeline.revert();
    };
    // onSetup deliberately left out of the deps array: it is expected to
    // be a stable function per call site (defined once per section, not
    // recreated every render), and including it would tear down and
    // rebuild the pin on every render where the caller re-creates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSpacing, scrollDistance]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
    </div>
  );
}
