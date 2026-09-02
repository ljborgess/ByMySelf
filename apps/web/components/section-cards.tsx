'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link } from '../i18n/navigation';
import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * The hub: one card per section, derived from the same list the header reads,
 * minus home (linking the page you are already on is noise). A section added
 * to that list therefore appears here without anyone remembering to add it.
 *
 * 'use client' (pedido do dono, 2026-08-27): mesmo reveal em stagger do
 * FeaturedProjects, pelo mesmo motivo -- ver o comentário lá pro raciocínio
 * completo (transform-only, ScrollTrigger só de entrada, sem pin).
 */
const CARD_SECTIONS = NAVIGATION_SECTIONS.filter(
  (section) => section.href !== '/',
);

export function SectionCards() {
  const tNav = useTranslations('nav');
  const t = useTranslations('home.cards');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const cards = list.querySelectorAll('[data-reveal-card]');
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    });

    timeline.from(cards, {
      y: 24,
      stagger: 0.08,
      duration: 0.6,
      ease: 'power2.out',
    });

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.revert();
    };
  }, []);

  return (
    <ul ref={listRef} className="grid gap-4 sm:grid-cols-2">
      {CARD_SECTIONS.map((section) => (
        <li key={section.href} data-reveal-card>
          <Link
            href={section.href}
            // the whole card is the target, not just the title -- a card that
            // looks clickable but only responds on its heading is a trap
            className="signal-glow group hover:border-accent focus-visible:border-accent flex h-full flex-col rounded-lg border border-white/15 p-5 transition-[color,border-color,transform] hover:-translate-y-0.5"
          >
            <span className="text-base font-semibold tracking-tight">
              {tNav(section.messageKey)}
            </span>
            <span className="mt-1 text-sm opacity-70">
              {t(section.messageKey)}
            </span>
            <span
              aria-hidden="true"
              className="group-hover:text-accent mt-4 font-mono text-sm opacity-50 transition-[opacity,color] group-hover:opacity-100"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
