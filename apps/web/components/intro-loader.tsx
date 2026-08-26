'use client';

import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'portfolio-intro-seen';

/**
 * Comprimento de traço generoso o bastante pra cobrir a saudação em
 * qualquer tamanho de tela -- `<text>` do SVG não expõe `getTotalLength()`
 * como `<path>` expõe, então não dá pra medir o comprimento real do
 * traçado. DrawSVGPlugin (gsap.com/docs/v3/Plugins/DrawSVGPlugin) resolveria
 * isso com precisão, e ficou de graça junto com o resto dos plugins em
 * 2024 -- mas só funciona em formas com comprimento real (path/line/
 * polyline/circle...), não em texto. `stroke-dasharray`/`stroke-dashoffset`
 * puro continua sendo a ferramenta certa aqui, não por causa de licença.
 */
const DASH_LENGTH = 1200;

/**
 * Intro (docs/design-clone-syahril.md): saudação desenhada à mão em SVG
 * antes do hero aparecer. Só na home, uma vez por sessão (sessionStorage)
 * -- não repete ao navegar entre páginas nem ao voltar pra home na mesma
 * aba.
 *
 * Não gate a renderização do resto da página: HomeContent sempre existe
 * no DOM, este componente só cobre visualmente por cima (`fixed inset-0`)
 * enquanto anima. `aria-hidden` no overlay inteiro -- é decoração
 * temporizada, não deve prender foco de teclado nem ficar no caminho de
 * quem usa leitor de tela.
 */
export function IntroLoader() {
  const t = useTranslations('intro');
  const [visible, setVisible] = useState(false);
  const textRef = useRef<SVGTextElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // sessionStorage indisponível (aba privada restrita etc.) -- trata
      // como "ainda não visto". Pior caso é a intro aparecer de novo numa
      // navegação futura, não travar a página.
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (alreadySeen || prefersReducedMotion) {
      return;
    }

    // Synchronizing with two external systems that only exist in the
    // browser (sessionStorage, matchMedia) -- there is no way to know
    // whether to show the intro before this effect runs once on mount, so
    // there is nothing to move into a render-time computation instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const text = textRef.current;
    const container = containerRef.current;
    if (!text || !container) {
      return;
    }

    const markSeenAndHide = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // ver o try/catch acima -- sem sessionStorage, a intro só volta a
        // aparecer na próxima visita, o que é aceitável.
      }
      setVisible(false);
    };

    const timeline = gsap.timeline({ onComplete: markSeenAndHide });

    timeline
      .set(text, {
        strokeDasharray: DASH_LENGTH,
        strokeDashoffset: DASH_LENGTH,
      })
      .to(text, {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: 'power1.inOut',
      })
      .to(container, { opacity: 0, duration: 0.5 }, '+=0.3');

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
      <svg viewBox="0 0 400 150" className="w-64 sm:w-96">
        <text
          ref={textRef}
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-script fill-none text-6xl sm:text-8xl"
          stroke="currentColor"
          strokeWidth="1"
        >
          {t('greeting')}
        </text>
      </svg>
    </div>
  );
}
