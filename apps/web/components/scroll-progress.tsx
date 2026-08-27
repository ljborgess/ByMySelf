'use client';

import { useEffect, useState } from 'react';

/**
 * Trilha de progresso de leitura, fixa na lateral direita.
 *
 * Existe por causa do pin: as seções pinadas (PinnedSection) seguram o
 * scroll, e sem uma referência de profundidade a página parece travada em
 * vez de avançando. A barra nativa do navegador não resolve porque o pin
 * distorce a relação entre o que se vê e o quanto já se rolou.
 *
 * O rótulo sai de `[data-section-label]`, não de uma lista de rotas: onde
 * não houver seções marcadas (todas as páginas exceto a home, que são
 * conteúdo corrido) o rótulo simplesmente não aparece, sem este componente
 * precisar saber em que rota está.
 *
 * `aria-hidden`: é releitura decorativa de uma informação que a barra de
 * rolagem nativa já dá a quem usa leitor de tela -- anunciar posição de
 * scroll a cada movimento seria ruído, não ajuda.
 *
 * Sem `transition` na altura de propósito: uma barra presa ao scroll que
 * anima com atraso fica sempre atrás do dedo, o que lê como travamento. O
 * efeito colateral é que ela já respeita `prefers-reduced-motion` sem
 * precisar de regra nenhuma -- não há movimento autônomo pra desligar,
 * só leitura de posição.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0,
      );

      // A seção "atual" é a última cujo topo já cruzou o meio da tela --
      // usar o topo do viewport trocaria o rótulo cedo demais, enquanto a
      // seção anterior ainda ocupa quase tudo que se vê.
      const marker = window.innerHeight / 2;
      let current: string | null = null;
      for (const section of document.querySelectorAll<HTMLElement>(
        '[data-section-label]',
      )) {
        if (section.getBoundingClientRect().top <= marker) {
          current = section.dataset.sectionLabel ?? null;
        }
      }
      setLabel(current);
    };

    // Coalescido num rAF: `scroll` dispara muito mais que uma vez por
    // quadro, e cada disparo aqui causaria um render do React à toa.
    const onScroll = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(measure);
      }
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    // Oculto abaixo de `sm`: 390px não sobra margem lateral pra uma trilha
    // sem encostar no conteúdo. pointer-events-none pra nunca roubar um
    // clique destinado ao que está atrás.
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex"
    >
      {label && (
        // opacity-70, não 50: a 10px o rótulo em 50% mede 3.71:1 contra
        // --background, abaixo dos 4.5:1 do AA (medido pelo axe). O
        // `aria-hidden` acima não isenta -- ele esconde de leitor de tela,
        // não de quem enxerga. 70% dá ~6.3:1 e continua discreto.
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70 [writing-mode:vertical-rl]">
          {label}
        </span>
      )}

      <div className="h-32 w-px bg-white/15">
        <div
          className="bg-highlight-red w-full"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
