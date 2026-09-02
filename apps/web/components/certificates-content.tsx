'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import type { Certificate } from '../content/profile';
import { formatIssuedAt, sortCertificates } from '../lib/certificates';
import { safeHref } from '../lib/urls';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  return parts[0]![0]!.toUpperCase();
}

function CertificateCard({
  entry,
  validateLabel,
  imageAltLabel,
  noImageLabel,
}: {
  entry: Certificate;
  validateLabel: string;
  imageAltLabel: string;
  noImageLabel: string;
}) {
  const issuedAt = formatIssuedAt(entry.issuedAt);

  return (
    <li
      data-reveal-card
      className="flex flex-col gap-4 border border-white/15 p-5 sm:flex-row sm:items-start"
    >
      {entry.imageUrl ? (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-white/10 sm:w-48">
          <Image
            src={entry.imageUrl}
            alt={imageAltLabel}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        // Same fallback idea as ProfileAvatar's initials -- a missing
        // credential image is a normal, expected state, not a broken one.
        <div
          aria-hidden="true"
          className="flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-lg border border-white/10 text-2xl font-black opacity-30 sm:w-48"
        >
          {initialsOf(entry.issuer)}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-black tracking-tight sm:text-2xl">
          {entry.name}
        </h3>
        <p className="font-mono text-xs tracking-widest text-foreground/60 uppercase">
          {entry.issuer}
        </p>
        {issuedAt && <p className="font-mono text-xs opacity-40">{issuedAt}</p>}
        {!entry.imageUrl && (
          <p className="font-mono text-xs opacity-40">{noImageLabel}</p>
        )}

        {safeHref(entry.credentialUrl) && (
          <a
            href={safeHref(entry.credentialUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            className="signal-glow mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            {validateLabel}
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </li>
  );
}

/**
 * Vertical list, one card per certificate (#154 grilling follow-up): the
 * previous version was a single-slide carousel that only showed entries
 * with an image, silently dropping every certificate without one -- 4 of
 * the profile's 6 entries never rendered at all. Every certificate is now
 * visible; a missing image falls back to the issuer's initial, matching the
 * `noImage` copy that already existed in messages/pt.json but was unused.
 */
export function CertificatesContent({
  certificates,
}: {
  certificates: Certificate[];
}) {
  const t = useTranslations('certificates');
  const entries = sortCertificates(certificates);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    const cards = list.querySelectorAll('[data-reveal-card]');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    });

    // y only, never opacity (#135) -- same rule every other reveal in the
    // codebase follows.
    tl.from(cards, {
      y: 24,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.out',
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('title')}
        </h3>
        <p className="opacity-70">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* "CERTIFICADOS" label — mirrors hero status pill */}
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase opacity-50">
        <span aria-hidden="true" className="h-px w-8 bg-current" />
        {t('title')}
      </p>

      <ul ref={listRef} className="flex flex-col gap-4">
        {entries.map((entry) => (
          <CertificateCard
            key={`${entry.issuer}-${entry.name}-${entry.issuedAt ?? 'undated'}`}
            entry={entry}
            validateLabel={t('validate')}
            imageAltLabel={t('imageAlt', {
              name: entry.name,
              issuer: entry.issuer,
            })}
            noImageLabel={t('noImage')}
          />
        ))}
      </ul>
    </div>
  );
}
