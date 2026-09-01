'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type ReactNode } from 'react';

/**
 * Timeline horizontal com scroll (docs/design-clone-syahril.md): linha com
 * um nó por item, nó ativo em destaque, card acima mostrando o item ativo
 * por inteiro. Genérico sobre o tipo do item (`getKey`/`renderNode`/
 * `renderCard`) -- mesma forma que o `Carousel` do épico anterior usava
 * (removido junto do épico aurora, #109), reusado aqui em Formação e
 * Certificados com dado próprio de cada página.
 *
 * Nó ativo muda por clique/toque no nó, não por detectar proximidade do
 * centro do viewport durante o scroll -- controle explícito é mais robusto
 * em touch (sem depender de heurística de scroll) e naturalmente acessível
 * por teclado (botão nativo). O trilho continua roláve/arrastável por
 * conta própria (`overflow-x-auto`), então quem prefere só arrastar/rolar
 * também consegue.
 */
export function HorizontalTimeline<T>({
  items,
  getKey,
  renderNode,
  renderCard,
  ariaLabel,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderNode: (item: T) => ReactNode;
  renderCard: (item: T) => ReactNode;
  ariaLabel: string;
}) {
  const t = useTranslations('timeline');
  const [activeIndex, setActiveIndex] = useState(0);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (items.length === 0) {
    return null;
  }

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    setActiveIndex(clamped);

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    nodeRefs.current[clamped]?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  return (
    <div
      role="group"
      aria-roledescription="timeline"
      aria-label={ariaLabel}
      className="flex flex-col gap-6"
    >
      <div className="border-highlight-red border p-5 sm:p-6">
        {renderCard(items[activeIndex])}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label={t('previous')}
          className="signal-glow hover:border-accent flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm transition-colors disabled:opacity-30"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="flex flex-1 items-center gap-8 overflow-x-auto px-2 py-3">
          {items.map((item, index) => (
            <button
              key={getKey(item)}
              ref={(el) => {
                nodeRefs.current[index] = el;
              }}
              type="button"
              onClick={() => goTo(index)}
              aria-current={index === activeIndex}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={`size-3 rounded-full border transition-colors ${
                  index === activeIndex
                    ? 'signal-glow signal-glow-active bg-highlight-red border-highlight-red'
                    : 'group-hover:border-accent border-white/30'
                }`}
              />
              <span
                className={`text-sm whitespace-nowrap ${index === activeIndex ? 'opacity-100' : 'opacity-60'}`}
              >
                {renderNode(item)}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === items.length - 1}
          aria-label={t('next')}
          className="signal-glow hover:border-accent flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm transition-colors disabled:opacity-30"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}
