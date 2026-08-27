'use client';

import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/**
 * "Hello" em vários idiomas, um de cada vez, dissolvendo um no outro --
 * mesma linguagem visual da tela de configuração inicial do iPhone
 * (pedido do dono, 2026-08-27). O último da lista é `t('greeting')`, não
 * mais um idioma qualquer -- a intro "chega" na saudação real do site
 * (a mesma que o hero mostra logo em seguida) antes de se dissolver, em
 * vez de terminar num idioma desconectado do resto da página.
 *
 * Aparece a cada carregamento da home (pedido do dono, 2026-08-27): ao
 * contrário da versão anterior, não guarda mais `sessionStorage` -- não
 * há noção de "já visto".
 *
 * Não gate a renderização do resto da página: HomeContent sempre existe
 * no DOM, este componente só cobre visualmente por cima (`fixed inset-0`)
 * enquanto anima. `aria-hidden` no overlay inteiro -- é decoração
 * temporizada, não deve prender foco de teclado nem ficar no caminho de
 * quem usa leitor de tela. Pulado inteiramente sob
 * `prefers-reduced-motion`: uma introdução decorativa que atrasa a
 * chegada ao conteúdo real não vale o gesto quando o visitante pediu
 * menos movimento.
 */
const OTHER_GREETINGS = [
  'Hello',
  'Bonjour',
  'Hola',
  'Ciao',
  '你好',
  'こんにちは',
];

export function IntroLoader() {
  const t = useTranslations('intro');
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const greetings = [...OTHER_GREETINGS, t('greeting')];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    // Nada além de matchMedia decide isto, e matchMedia só existe no
    // navegador -- não há como saber antes de este efeito rodar uma vez
    // no mount, então não há cálculo em tempo de render pra mover pra cá.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const container = containerRef.current;
    const words = wordRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    if (!container || words.length === 0) {
      return;
    }

    const markHidden = () => setVisible(false);
    const timeline = gsap.timeline({ onComplete: markHidden });

    words.forEach((word, index) => {
      const isLast = index === words.length - 1;

      timeline.to(word, {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        ease: 'power1.out',
      });

      // A última palavra (a saudação real do site) fica visível em vez de
      // sumir -- é nela que a intro "pousa" antes do container inteiro se
      // dissolver, não mais um idioma solto trocando pro próximo.
      if (!isLast) {
        timeline.to(
          word,
          { opacity: 0, scale: 1.05, duration: 0.2, ease: 'power1.in' },
          '+=0.28',
        );
      }
    });

    timeline.to(container, { opacity: 0, duration: 0.5 }, '+=0.35');

    return () => {
      timeline.kill();
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="bg-background fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* mesma célula de grid pra todas -- pilha exatamente centralizada,
          sem depender da largura de cada palavra pra não pular. */}
      <div className="grid">
        {greetings.map((word, index) => (
          <span
            key={word}
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className="font-display col-start-1 row-start-1 scale-90 text-6xl font-black opacity-0 sm:text-8xl"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
