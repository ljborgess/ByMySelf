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

function BentoCard({
  entry,
  ongoingLabel,
  completedLabel,
  labels,
}: {
  entry: Education;
  ongoingLabel: string;
  completedLabel: string;
  labels: {
    status: string;
    period: string;
    institution: string;
    stack: string;
  };
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isOngoing = entry.endDate === null;
  const period = formatPeriod(entry, ongoingLabel);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale(1.01)`;
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform =
      'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  }

  // Neutral at rest (DESIGN.md's Card spec: no fill, border-white/15) --
  // the only color signal left is the green pulse+label on "status", the
  // same "live" dot every other page already uses (Sobre/Hero), not a
  // tinted border/background/divider (highlight-green's one documented job
  // is a status dot, not a card decoration).
  const metaText = isOngoing ? 'text-highlight-green' : 'text-foreground/60';

  return (
    <div
      ref={cardRef}
      data-bento-card
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="grid grid-cols-[1fr_auto] border border-white/15 transition-transform duration-200 ease-out will-change-transform"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Course name — large display, left-top */}
      <div className="border-r border-b border-white/10 p-6 sm:p-8">
        <h2 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          {entry.course}
        </h2>
      </div>

      {/* Status + Period — right column, stacked */}
      <div className="flex min-w-[140px] flex-col divide-y divide-white/10 sm:min-w-[180px]">
        <div className="flex flex-col gap-2 p-4">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
            {labels.status}
          </span>
          <div className="flex items-center gap-2">
            {isOngoing && (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-highlight-green motion-safe:animate-pulse"
              />
            )}
            <span className={`font-mono text-[11px] tracking-wide ${metaText}`}>
              {isOngoing ? ongoingLabel : completedLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
            {labels.period}
          </span>
          <span
            className={`font-mono text-[11px] ${period ? '' : 'opacity-30'}`}
          >
            {period ?? '—'}
          </span>
        </div>
      </div>

      {/* Institution + Stack — bottom row, full width */}
      <div className="col-span-2 flex divide-x divide-white/10 border-t border-white/10">
        <div className="flex min-w-[120px] flex-col gap-2 p-4 sm:p-5">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
            {labels.institution}
          </span>
          <span
            className={`text-sm ${entry.institution ? 'opacity-80' : 'font-mono opacity-25'}`}
          >
            {entry.institution ?? '—'}
          </span>
        </div>

        {entry.technologies && entry.technologies.length > 0 ? (
          <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
              {labels.stack}
            </span>
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
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
              {labels.stack}
            </span>
            <span className="font-mono text-sm opacity-25">—</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EducationContent({ education }: { education: Education[] }) {
  const t = useTranslations('education');
  const containerRef = useRef<HTMLDivElement>(null);
  const entries = sortEducation(education);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>('[data-bento-card]');
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
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

  const labels = {
    status: t('labels.status'),
    period: t('labels.period'),
    institution: t('labels.institution'),
    stack: t('labels.stack'),
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {entries.map((entry) => (
        <BentoCard
          key={`${entry.course}-${entry.institution ?? ''}`}
          entry={entry}
          ongoingLabel={t('ongoing')}
          completedLabel={t('completed')}
          labels={labels}
        />
      ))}
    </div>
  );
}
