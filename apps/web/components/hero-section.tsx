'use client';

import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { profile } from '../content/profile';
import { Link } from '../i18n/navigation';
import { ProfileAvatar } from './profile-avatar';

/**
 * Hero da home (docs/design-clone-syahril.md): reveal ao carregar a
 * página, não ao rolar -- é o primeiro elemento visível, então a timeline
 * dispara no mount em vez de usar `PinnedFrameSection`/`ScrollTrigger.
 * Bloco de cor de destaque atrás do nome, botão pill (CTA pra /projetos)
 * + botão circular (rola pra próxima seção).
 *
 * O par pill+círculo se repete no footer (#134) -- não virou componente
 * compartilhado ainda porque só há um consumidor até agora; extrair fica
 * pra quando o segundo existir de verdade.
 */
export function HeroSection() {
  const t = useTranslations('hero');
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

    const stages = container.querySelectorAll('[data-stage]');
    const timeline = gsap.timeline();
    timeline.from(stages, {
      opacity: 0,
      y: 40,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power2.out',
    });

    return () => {
      timeline.kill();
    };
  }, []);

  const scrollToNext = () => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    window.scrollBy({
      top: window.innerHeight * 0.8,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* stacks on mobile, side by side from sm -- a 375px viewport cannot
          fit an avatar beside two lines of text without cramping both */}
      <div
        data-stage
        className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6"
      >
        <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} />

        <div>
          <h1 className="font-display relative inline-block text-4xl font-black tracking-tight sm:text-6xl">
            <span
              aria-hidden="true"
              className="bg-highlight-gold absolute inset-x-[-0.15em] top-[55%] -z-10 h-[0.45em] -translate-y-1/2 opacity-80"
            />
            {profile.name}
          </h1>
          <p className="text-accent mt-2 font-mono text-base sm:text-lg">
            {profile.headline}
          </p>
        </div>
      </div>

      <div data-stage className="flex items-center gap-3">
        <Link
          href="/projetos"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          {t('cta')}
        </Link>
        <button
          type="button"
          onClick={scrollToNext}
          aria-label={t('scrollHint')}
          className="border-highlight-red hover:bg-highlight-red flex size-11 items-center justify-center rounded-full border transition-colors"
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  );
}
