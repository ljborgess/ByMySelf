'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Certificate } from '../content/profile';
import { formatIssuedAt, sortCertificates } from '../lib/certificates';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function CertificatesContent({
  certificates,
}: {
  certificates: Certificate[];
}) {
  const t = useTranslations('certificates');
  const tNav = useTranslations('timeline');

  const sorted = sortCertificates(certificates);
  const entries = sorted.filter((c) => c.imageUrl !== null);

  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Scroll-triggered entrance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

    tl.from(container, {
      opacity: 0,
      y: 32,
      duration: 0.7,
      ease: 'power2.out',
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, []);

  // Fade in after slide content changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const slide = slideRef.current;
    if (!slide) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      slide,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power1.out' },
    );
  }, [activeIndex]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="opacity-70">{t('empty')}</p>
      </div>
    );
  }

  const goTo = (nextIndex: number) => {
    const slide = slideRef.current;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!slide || prefersReducedMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    gsap.to(slide, {
      opacity: 0,
      duration: 0.2,
      ease: 'power1.in',
      onComplete: () => setActiveIndex(nextIndex),
    });
  };

  const entry = entries[activeIndex]!;
  const issuedAt = formatIssuedAt(entry.issuedAt);

  return (
    <div ref={containerRef} className="flex flex-col gap-10">
      {/* "CERTIFICADOS" label — mirrors hero status pill */}
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase opacity-50">
        <span aria-hidden="true" className="h-px w-8 bg-current" />
        {t('title')}
      </p>

      {/* Two-column slide: details left, image right */}
      <div
        ref={slideRef}
        className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_1fr]"
      >
        {/* Left: cert details */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">
              {entry.name}
            </h1>
            <p className="mt-2 font-mono text-sm opacity-60">{entry.issuer}</p>
            {issuedAt && (
              <p className="mt-1 font-mono text-xs opacity-40">{issuedAt}</p>
            )}
          </div>

          {entry.credentialUrl && (
            <a
              href={entry.credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {t('validate')}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>

        {/* Right: certificate image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/[0.08]">
          <Image
            src={entry.imageUrl!}
            alt={t('imageAlt', { name: entry.name, issuer: entry.issuer })}
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Navigation: prev + dots + next */}
      {entries.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label={tNav('previous')}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm transition-colors hover:border-white/40 disabled:opacity-30"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div
            role="group"
            aria-label={t('title')}
            className="flex flex-1 justify-center gap-2"
          >
            {entries.map((cert, i) => (
              <button
                key={`${cert.issuer}-${cert.name}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={cert.name}
                aria-current={i === activeIndex}
                className={`size-2 rounded-full transition-colors ${
                  i === activeIndex
                    ? 'bg-white'
                    : 'bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === entries.length - 1}
            aria-label={tNav('next')}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm transition-colors hover:border-white/40 disabled:opacity-30"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
    </div>
  );
}
