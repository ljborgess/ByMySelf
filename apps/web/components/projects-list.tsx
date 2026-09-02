'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import type { PinnedRepo } from '../lib/projects';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function ProjectCard({
  repo,
  codeLabel,
  demoLabel,
}: {
  repo: PinnedRepo;
  codeLabel: string;
  demoLabel: string;
}) {
  return (
    <li
      data-reveal-card
      className="flex flex-col gap-4 border border-white/15 p-5 sm:flex-row sm:items-start"
    >
      {/* plain <img>, not next/image: openGraphImageUrl is a GitHub-hosted
          URL, but arbitrary per repo -- same reasoning certificates-content
          and featured-projects already follow for owner-pasted URLs */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={repo.imageUrl}
        alt=""
        loading="lazy"
        className="aspect-video w-full shrink-0 rounded-lg border border-white/10 object-cover sm:w-64"
      />

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-black tracking-tight sm:text-2xl">
          {repo.name}
        </h3>
        {repo.description && (
          <p className="text-sm opacity-70">{repo.description}</p>
        )}

        {repo.techStack.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {repo.techStack.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex flex-wrap gap-3">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="signal-glow inline-flex w-fit items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            {codeLabel}
            <span aria-hidden="true">↗</span>
          </a>

          {repo.homepageUrl && (
            <a
              href={repo.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="signal-glow inline-flex w-fit items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              {demoLabel}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * `/projetos` (docs/decisao-projetos-github-pins.md): mirrors
 * certificates-content.tsx's card shape -- image, text, external link -- for
 * the owner's pinned GitHub repos instead of an internally curated CRUD
 * listing. No detail page: the repo itself is the detail.
 */
export function ProjectsList({
  projects,
  failed,
}: {
  projects: PinnedRepo[];
  failed: boolean;
}) {
  const t = useTranslations('projects');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    const cards = list.querySelectorAll('[data-reveal-card]');
    if (!cards.length) return;

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
  }, [projects]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      {failed ? (
        <p className="opacity-70">{t('error')}</p>
      ) : projects.length === 0 ? (
        <p className="opacity-70">{t('empty')}</p>
      ) : (
        <ul ref={listRef} className="flex flex-col gap-4">
          {projects.map((repo) => (
            <ProjectCard
              key={repo.url}
              repo={repo}
              codeLabel={t('code')}
              demoLabel={t('demo')}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
