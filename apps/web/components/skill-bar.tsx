'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import type { SkillLevel } from '../content/profile';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const LEVEL_CONFIG: Record<SkillLevel, { fill: number; label: string }> = {
  EXPERT: { fill: 1.0, label: 'EXPERT' },
  ADV: { fill: 0.75, label: 'ADV' },
  INT: { fill: 0.5, label: 'INT' },
  JR: { fill: 0.28, label: 'JR' },
};

export function SkillBar({
  name,
  level,
  displayLabel,
}: {
  name: string;
  level: SkillLevel;
  displayLabel?: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const config = LEVEL_CONFIG[level];

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(fill, { scaleX: config.fill });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: fill,
        start: 'top 90%',
        once: true,
      },
    });

    tl.fromTo(
      fill,
      { scaleX: 0 },
      {
        scaleX: config.fill,
        duration: 0.7,
        ease: 'power2.out',
        transformOrigin: 'left center',
      },
    );

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, [config.fill]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 font-mono text-xs text-foreground/70 truncate">
        {name}
      </span>
      <div className="relative h-px flex-1 bg-white/10">
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 w-full origin-left bg-foreground/70"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-[10px] tracking-widest text-foreground/60 uppercase">
        {displayLabel ?? config.label}
      </span>
    </div>
  );
}
