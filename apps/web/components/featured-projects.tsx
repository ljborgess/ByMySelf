'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link } from '../i18n/navigation';
import type { PublicProjectListItem } from '../lib/projects';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Prévia de projetos em destaque na home (docs/design-clone-syahril.md).
 * A home hoje só linka para /projetos (SectionCards) sem mostrar projeto
 * nenhum -- esta seção é a primeira prova social visível sem sair da home.
 *
 * Recebe a lista já filtrada por `featured`, não filtra sozinha: quem chama
 * (page.tsx) já decide o que "falhou ao carregar" significa aqui (nada --
 * ver o comentário lá), então este componente só sabe renderizar o que
 * recebeu.
 *
 * Grid simples, não o mosaico assimétrico de /projetos (#132): a referência
 * não tem prévia de projeto nenhuma na home, só o link da seção "Journal" --
 * o mosaico é decisão de design específica dessa seção própria, não algo pra
 * replicar num resumo curto.
 *
 * 'use client' (pedido do dono, 2026-08-27 -- "encaixa animação aonde
 * fica legal"): os cards entravam sem nenhum gesto, destoando do resto da
 * home (hero, Core Focus, Stats já têm reveal autoral). Stagger num
 * `ScrollTrigger` só de entrada (`once`), não pinado -- é uma lista de
 * cards, não um bloco único; pinar a rolagem inteira pra um grid que já
 * cabe na tela seria exagero (ver animate.md: "never reinterpret every
 * scrolled section as a staggered list" é sobre NÃO pinar isto, não sobre
 * deixar de animar). Só `y` (nunca opacity, mesma razão do #135 em
 * core-focus-section.tsx): mesmo que o ScrollTrigger dispare tarde, o
 * card real continua visível, só deslocado -- nunca lê como quebrado.
 */
export function FeaturedProjects({
  projects,
}: {
  projects: PublicProjectListItem[];
}) {
  const t = useTranslations('home');
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
  }, [projects]);

  // Seção vazia não aparece -- mesmo princípio que about/page.tsx já usa
  // pra bio/objetivo: uma seção sem conteúdo real parece quebrada, ausente
  // não.
  if (projects.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t('featuredHeading')}
      </h2>

      <ul
        ref={listRef}
        aria-label={t('featuredHeading')}
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((project) => (
          <li key={project.id} data-reveal-card>
            <Link
              href={`/projetos/${project.slug}`}
              className="signal-glow hover:border-accent focus-visible:border-accent group flex h-full flex-col rounded-lg border border-white/15 p-5 transition-[color,border-color,transform] hover:-translate-y-0.5"
            >
              {project.coverImageUrl && (
                // plain <img>, not next/image -- same reasoning as
                // projects-list.tsx: photoUrl/coverImageUrl is an arbitrary
                // external URL the owner pastes in
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.coverImageUrl}
                  alt={project.title}
                  loading="lazy"
                  className="mb-3 aspect-video w-full rounded bg-white/10 object-cover"
                />
              )}

              <span className="text-base font-semibold tracking-tight">
                {project.title}
              </span>
              <p className="mt-1 text-sm opacity-70">{project.description}</p>

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
    </section>
  );
}
