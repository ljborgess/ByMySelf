'use client';

import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import { PinnedSection } from './pinned-section';

/**
 * "Quote/Core Focus" (docs/design-clone-syahril.md): label pequeno em
 * destaque, citação grande misturando peso bold + itálico serifado,
 * duas colunas de apoio, assinatura cursiva. Reaproveita
 * `content/profile.ts` -- não é conteúdo novo, só apresentação nova.
 *
 * 'use client': `onSetup` abaixo é uma função passada pro
 * `PinnedSection` (Client Component) -- mesma regra de fronteira
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
      <PinnedSection
        className="py-10 sm:py-14"
        onSetup={(timeline, container) => {
          const query = (selector: string) =>
            container.querySelectorAll(selector);

          // Transforms only, never opacity (#135 follow-up). A scrubbed
          // .from() applies its starting values at page load, but the
          // ScrollTrigger does not begin until `top top` -- so anything
          // starting at opacity 0 leaves the frame sitting on screen
          // visibly empty until the pin engages. Offsets keep every word
          // readable at progress 0; only the rule has nothing to show yet,
          // which reads as "not drawn" rather than "broken".
          //
          // Dimming the italic clause instead was measured and rejected:
          // --foreground at 0.35 over --background is 2.38:1, below AA
          // even for large text.
          timeline
            .from(query('[data-reveal="lead"]'), {
              y: 24,
              stagger: 0.2,
            })
            .from(
              query('[data-reveal="rule"]'),
              { scaleX: 0, transformOrigin: 'left center' },
              '<0.2',
            )
            .from(query('[data-reveal="column-start"]'), { x: -16 }, '<0.15')
            .from(query('[data-reveal="column-end"]'), { x: 16 }, '<')
            .from(query('[data-reveal="signature"]'), { y: 20 }, '<0.2');
        }}
      >
        <p
          data-reveal="lead"
          className="text-highlight-red font-mono text-xs tracking-[0.2em] uppercase"
        >
          {t('label')}
        </p>

        <blockquote
          data-reveal="lead"
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

        <hr data-reveal="rule" className="mt-8 border-white/15" />

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div data-reveal="column-start">
            <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              {t('aboutLabel')}
            </h2>
            <p className="mt-2 text-sm whitespace-pre-line opacity-80">
              {aboutText}
            </p>
          </div>
          <div data-reveal="column-end">
            <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              {t('focusLabel')}
            </h2>
            <p className="mt-2 text-sm whitespace-pre-line opacity-80">
              {focusText}
            </p>
          </div>
        </div>

        <p data-reveal="signature" className="font-script mt-8 text-3xl">
          {profile.name}
        </p>
      </PinnedSection>
    </section>
  );
}
