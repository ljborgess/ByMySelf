'use client';

import { useEffect, useState } from 'react';

/** Tempo que cada frase fica parada, sem contar a transição. */
const HOLD_MS = 3200;
/** Duração do cruzamento entre uma frase e a próxima. */
const FADE_MS = 500;

/**
 * Frases do hero que se alternam em fade (pedido do dono, 2026-08-26).
 *
 * As frases ficam todas empilhadas na mesma célula de grid em vez de o
 * texto ser trocado no lugar: assim o contêiner já nasce com a altura da
 * frase mais alta e nada salta quando a mais curta entra. Trocar o
 * conteúdo de um único elemento faria a página pular no mobile, onde
 * "Desenvolvedor Full-Stack — NestJS, Next.js e TypeScript" ocupa duas
 * linhas e "Criador de Produtos" ocupa uma.
 *
 * `aria-hidden` na parte que gira, com a primeira frase repetida em
 * `sr-only`: quem usa leitor de tela recebe uma identidade estável em vez
 * de ouvir a mesma região se reanunciar a cada poucos segundos. A rotação
 * é enfeite visual, não informação nova -- as outras frases não dizem
 * nada que o resto da página não diga.
 *
 * Para sob `prefers-reduced-motion` (fica na primeira frase, parada) e
 * enquanto o ponteiro está em cima. O WCAG 2.2.2 (Pause, Stop, Hide,
 * nível A) pede um mecanismo de pausa para conteúdo que se atualiza
 * sozinho; a pausa no hover é parcial -- um controle visível de pausa
 * seria a conformidade completa, e está registrado como pendência.
 */
export function RotatingHeadline({
  messages,
  className = '',
  showCursor = false,
}: {
  messages: string[];
  className?: string;
  /** Cursor de terminal piscando ao fim da frase visível. */
  showCursor?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (messages.length < 2 || paused) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, HOLD_MS + FADE_MS);

    return () => {
      clearInterval(timer);
    };
  }, [messages.length, paused]);

  if (messages.length === 0) {
    return null;
  }

  return (
    // <span>, não <p>: o hero envolve isto num <p> com o prompt ">" ao
    // lado, e <p> dentro de <p> é HTML inválido -- o parser fecha o de
    // fora sozinho e a hidratação do React diverge do servidor.
    <span
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="sr-only">{messages[0]}</span>

      <span aria-hidden="true" className="grid">
        {messages.map((message, position) => (
          <span
            key={message}
            // todas na mesma célula (linha 1, coluna 1) -- é o que faz o
            // contêiner medir pela frase mais alta e nunca encolher
            className="col-start-1 row-start-1 transition-opacity"
            style={{
              opacity: position === index ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
            }}
          >
            {message}
            {/* dentro de cada frase, não depois do bloco: como todas
                dividem a mesma célula, o bloco é tão largo quanto a frase
                mais longa -- um cursor solto no fim ficaria boiando longe
                do texto sempre que a frase curta estivesse na vez */}
            {showCursor && (
              <span className="terminal-cursor bg-accent ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.12em]" />
            )}
          </span>
        ))}
      </span>
    </span>
  );
}
