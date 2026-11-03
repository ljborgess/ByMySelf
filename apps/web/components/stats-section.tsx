'use client';

import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import { PinnedSection } from './pinned-section';

interface Stat {
  key: string;
  value: number;
  label: string;
}

/**
 * "Stats" (docs/design-clone-syahril.md): badge com ponto pulsante, headline
 * grande, 4 números com contagem animada. As métricas são as que dá pra
 * contar de dado real -- nada estimado ou inventado: projetos publicados
 * (contagem da API, via HomeContent), tecnologias/certificados/idiomas
 * (tamanho dos arrays em content/profile.ts). GPA da referência não se
 * aplica aqui e não tem equivalente honesto -- não virou stat nenhuma.
 *
 * 'use client': mesma razão do CoreFocusSection -- `onSetup` é função
 * passada pro `PinnedSection` (Client Component).
 */
export function StatsSection({ projectCount }: { projectCount: number }) {
  const t = useTranslations('stats');

  const stats: Stat[] = [
    { key: 'projects', value: projectCount, label: t('projects') },
    {
      key: 'technologies',
      value: profile.skills.length,
      label: t('technologies'),
    },
    {
      key: 'certificates',
      value: profile.certificates.length,
      label: t('certificates'),
    },
    {
      key: 'languages',
      value: profile.languages.length,
      label: t('languages'),
    },
  ].filter((stat) => stat.value > 0);
  // ^ um fetch de projetos que falhou chega aqui como 0 -- "0 projetos" lê
  // como fato, não como falha. Mesmo princípio do resto do site: dado
  // ausente esconde, nunca exibe número enganoso.

  return (
    <section>
      <PinnedSection
        className="py-10 sm:py-14"
        onSetup={(timeline, container) => {
          const counters = container.querySelectorAll<HTMLElement>(
            '[data-counter-target]',
          );

          counters.forEach((el) => {
            const target = Number(el.dataset.counterTarget);
            const state = { value: 0 };

            timeline.to(
              state,
              {
                value: target,
                duration: 1,
                ease: 'power1.out',
                onUpdate: () => {
                  el.textContent = String(Math.round(state.value));
                },
                // Fires once the count lands -- a brief text-glow (globals.css
                // .value-pulse) marking the number as freshly "read," not a
                // looping effect competing with the count itself.
                onComplete: () => {
                  el.classList.add('value-pulse');
                },
              },
              0,
            );
          });
        }}
      >
        <span
          data-stage
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-mono text-xs tracking-[0.15em] uppercase"
        >
          <span
            aria-hidden="true"
            className="bg-highlight-green motion-safe:animate-pulse size-2 rounded-full"
          />
          {t('badge')}
        </span>

        <h2
          data-stage
          className="font-display mt-4 text-3xl leading-tight font-black sm:text-5xl"
        >
          {t('headline', {
            skills: profile.skills
              .slice(0, 3)
              .map((s) => s.name)
              .join('. '),
          })}
        </h2>

        <div
          data-stage
          // Borda por célula (direita + baixo) e o container fecha topo +
          // esquerda: divide-x/divide-y somados num grid de 2 colunas
          // dobravam a linha no topo-direito e na esquerda da 2ª linha.
          className="mt-8 grid grid-cols-2 border-t border-l border-dashed border-white/15 sm:grid-cols-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.key}
              className="border-r border-b border-dashed border-white/15 p-4 sm:p-6"
            >
              <p className="text-xs tracking-wide uppercase opacity-70">
                {stat.label}
              </p>
              {/* sem "+": as contagens são exatas (6 certificados são 6),
                  e o sufixo inflava um número verificável */}
              <p className="font-display mt-1 text-3xl font-black tabular-nums sm:text-4xl">
                <span data-counter-target={stat.value}>{stat.value}</span>
              </p>
            </div>
          ))}
        </div>
      </PinnedSection>
    </section>
  );
}
