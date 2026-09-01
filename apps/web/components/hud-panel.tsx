'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function HudPanel({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const scan = scanRef.current;
    if (!panel || !scan) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        start: 'top 85%',
        once: true,
      },
    });

    tl.from(panel, { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' });

    if (!prefersReducedMotion) {
      const height = scan.parentElement?.offsetHeight ?? 200;
      tl.fromTo(
        scan,
        { y: 0, opacity: 0.7 },
        { y: height, opacity: 0, duration: 0.65, ease: 'none' },
        '-=0.05',
      );
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={`relative border border-highlight-gold/30 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-4 select-none bg-background px-2 font-mono text-[10px] tracking-[0.2em] text-highlight-gold uppercase"
      >
        {label}
      </span>

      <div className="relative overflow-hidden">
        <div
          ref={scanRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-highlight-gold to-transparent opacity-0"
        />
        {children}
      </div>
    </div>
  );
}
