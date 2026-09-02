'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Education } from '../content/profile';
import { formatPeriod, sortEducation } from '../lib/education';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function EducationCard({
  entry,
  ongoingLabel,
  completedLabel,
}: {
  entry: Education;
  ongoingLabel: string;
  completedLabel: string;
}) {
  const isOngoing = entry.endDate === null;
  const period = formatPeriod(entry, ongoingLabel);

  // Neutral at rest (DESIGN.md's Card spec: no fill, border-white/15) --
  // the only color signal left is the green pulse+label on "status", the
  // same "live" dot every other page already uses (Sobre/Hero).
  const statusText = isOngoing ? 'text-highlight-green' : 'text-foreground/60';

  return (
    <li
      data-reveal-card
      className="flex flex-col gap-3 border border-white/15 p-5"
    >
      <h3 className="font-display text-xl font-black tracking-tight sm:text-2xl">
        {entry.course}
      </h3>

      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {isOngoing && (
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-highlight-green motion-safe:animate-pulse"
          />
        )}
        <span className={statusText}>
          {isOngoing ? ongoingLabel : completedLabel}
        </span>
        {period && <span className="opacity-40">· {period}</span>}
      </div>

      {entry.institution && (
        <p className="font-mono text-xs tracking-widest text-foreground/60 uppercase">
          {entry.institution}
        </p>
      )}

      {entry.technologies && entry.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function EducationContent({ education }: { education: Education[] }) {
  const t = useTranslations('education');
  const listRef = useRef<HTMLUListElement>(null);
  const entries = sortEducation(education);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const cards = list.querySelectorAll<HTMLElement>('[data-reveal-card]');
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: list,
        start: 'top 85%',
        once: true,
      },
    });

    // y only, never opacity (#135): if the ScrollTrigger fires late (or JS
    // is slow to hydrate), a card starting at opacity 0 could sit invisible
    // indefinitely -- offset-only keeps it visible, just displaced, which
    // never reads as broken. Same rule section-cards.tsx/featured-projects.tsx
    // already follow.
    tl.from([...cards], {
      y: 28,
      stagger: 0.14,
      duration: 0.55,
      ease: 'power2.out',
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, []);

  if (entries.length === 0) {
    return <p className="opacity-70">{t('empty')}</p>;
  }

  return (
    <ul ref={listRef} className="flex flex-col gap-4">
      {entries.map((entry) => (
        <EducationCard
          key={`${entry.course}-${entry.institution ?? ''}`}
          entry={entry}
          ongoingLabel={t('ongoing')}
          completedLabel={t('completed')}
        />
      ))}
    </ul>
  );
}
