'use client';

import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import { PinnedFrameSection } from './pinned-frame-section';

/**
 * "Quote/Core Focus" (docs/design-clone-syahril.md): label pequeno em
 * destaque, citação grande misturando peso bold + itálico serifado,
 * duas colunas de apoio, assinatura cursiva. Reaproveita
 * `content/profile.ts` -- não é conteúdo novo, só apresentação nova.
 *
 * 'use client': `onSetup` abaixo é uma função passada pro
 * `PinnedFrameSection` (Client Component) -- mesma regra de fronteira
 * Server/Client que quebrou o Carousel antes de #122 corrigir. Um Server
 * Component não pode passar função como prop pra um Client Component.
 *
 * Ausente inteira sem bio (mesmo princípio de seção que about/page.tsx já
 * usa): uma citação vazia parece quebrada, ausente não.
 */
export function CoreFocusSection() {
  const t = useTranslations('coreFocus');

  if (!profile.bio) {
    return null;
  }

  // Headline como "Desenvolvedor Full-Stack — NestJS, Next.js e
  // TypeScript" -- a parte antes do travessão vira o peso bold, a de
  // depois o itálico serifado. Sem travessão, tudo cai no bold (sem
  // itálico vazio renderizando nada).
  const headlineParts = profile.headline.split(' — ');
  const boldHeadline = headlineParts[0];
  const italicHeadline = headlineParts.length > 1 ? headlineParts[1] : null;

  // bio tem parágrafos separados por linha em branco (ver profile.ts) --
  // primeiro parágrafo pra coluna "Sobre", último pra "Foco" (é onde o
  // texto já fala especificamente de stack/prioridades técnicas).
  const paragraphs = profile.bio.split('\n\n').filter(Boolean);
  const aboutText = paragraphs[0];
  const focusText = paragraphs[paragraphs.length - 1];

  return (
    <section>
      <PinnedFrameSection
        className="px-6 py-10 sm:px-10 sm:py-14"
        onSetup={(timeline, container) => {
          const stages = container.querySelectorAll('[data-stage]');
          timeline.from(stages, { opacity: 0, y: 32, stagger: 0.2 });
        }}
      >
        <p
          data-stage
          className="text-highlight-red font-mono text-xs tracking-[0.2em] uppercase"
        >
          {t('label')}
        </p>

        <blockquote
          data-stage
          className="mt-4 text-3xl leading-tight sm:text-5xl"
        >
          <span aria-hidden="true" className="opacity-30">
            &ldquo;
          </span>
          <span className="font-display font-black">{boldHeadline}</span>
          {italicHeadline && (
            <>
              {' '}
              <span className="font-serif-italic opacity-70 italic">
                {italicHeadline}
              </span>
            </>
          )}
          <span aria-hidden="true" className="opacity-30">
            &rdquo;
          </span>
        </blockquote>

        <hr data-stage className="mt-8 border-white/15" />

        <div data-stage className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              {t('aboutLabel')}
            </h3>
            <p className="mt-2 text-sm whitespace-pre-line opacity-80">
              {aboutText}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              {t('focusLabel')}
            </h3>
            <p className="mt-2 text-sm whitespace-pre-line opacity-80">
              {focusText}
            </p>
          </div>
        </div>

        <p data-stage className="font-script mt-8 text-3xl">
          {profile.name}
        </p>
      </PinnedFrameSection>
    </section>
  );
}
