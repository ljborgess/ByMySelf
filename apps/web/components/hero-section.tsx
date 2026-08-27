'use client';

import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { profile } from '../content/profile';
import { Link } from '../i18n/navigation';
import { HeroSocialLinks } from './hero-social-links';
import { RotatingHeadline } from './rotating-headline';

// Registrado no escopo do módulo, guardado por `window`: no servidor não
// há DOM para o plugin tocar. Mesmo padrão do ScrollTrigger em
// pinned-section.tsx.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrambleTextPlugin);
}

/**
 * Hero da home: reveal ao carregar a página, não ao rolar -- é o primeiro
 * elemento visível, então a timeline dispara no mount em vez de usar
 * `PinnedSection`/`ScrollTrigger`.
 *
 * Estética de terminal (escolha do dono, 2026-08-26): linha de status com
 * ponto verde pulsante, saudação + nome em destaque, e a tagline como
 * saída de terminal (prompt ">" e cursor piscando). Substitui o par
 * avatar + barra dourada que existia antes.
 *
 * O par pill+círculo se repete no footer (#134) -- não virou componente
 * compartilhado ainda porque só há um consumidor até agora; extrair fica
 * pra quando o segundo existir de verdade.
 *
 * CTA principal = baixar o CV (pedido do dono, 2026-08-26), não mais "Ver
 * projetos": o projeto inteiro é a vitrine, e a rota /projetos já está no
 * menu -- o PDF é a única coisa que o visitante leva embora.
 */
export function HeroSection() {
  const t = useTranslations('hero');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const stages = container.querySelectorAll('[data-stage]');
    const timeline = gsap.timeline();
    timeline.from(stages, {
      opacity: 0,
      y: 40,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power2.out',
    });

    // O nome se decodifica em vez de só aparecer -- é o gesto que carrega
    // a estética de terminal. `.to` com o nome real como destino: o texto
    // correto já veio do servidor no HTML (importa para busca e para quem
    // está sem JS), e a animação só embaralha e resolve de volta nele.
    const nameElement = container.querySelector('[data-scramble]');
    if (nameElement) {
      timeline.to(
        nameElement,
        {
          duration: 1.1,
          ease: 'none',
          scrambleText: {
            text: profile.name,
            chars: 'upperCase',
            speed: 0.5,
          },
        },
        0.35,
      );
    }

    // .revert(), not .kill() (#135 audit): React 18 Strict Mode
    // double-invokes this effect in dev (mount, cleanup, mount again,
    // synchronously). .kill() stops the tween but leaves its .from()
    // starting values (opacity: 0) as inline styles; the second mount's
    // .from() then reads that as the element's "natural" end state and
    // tweens 0 -> 0 -- it reports onComplete/progress 1 while the content
    // stays invisible forever. .revert() strips the inline styles it
    // applied instead of freezing them, so the remount starts clean.
    return () => {
      timeline.revert();
    };
  }, []);

  // Uma classe para os dois: o CTA é o mesmo botão branco, mude o destino
  // e não a aparência.
  const ctaClassName =
    'rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90';

  const scrollToNext = () => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    window.scrollBy({
      top: window.innerHeight * 0.8,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Linha de status: mesmo ponto verde pulsante que a seção "EM
          NÚMEROS" já usa, reaproveitado em vez de inventar outro sinal.
          motion-safe: quem pediu menos movimento recebe o ponto parado,
          que continua marcando o estado. */}
      <p
        data-stage
        className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase opacity-70"
      >
        <span
          aria-hidden="true"
          className="bg-highlight-green motion-safe:animate-pulse size-2 shrink-0 rounded-full"
        />
        {t('status')}
      </p>

      {/* Sem avatar: sem foto real o bloco só mostrava iniciais e roubava
          a largura de um retrato sem entregar um. A foto segue na página
          Sobre, onde há espaço para ela valer alguma coisa.

          Sem a barra dourada que ficava atrás do nome: cruzava a própria
          tinta das letras e lia como artefato de renderização, não como
          marca-texto -- e escurecê-la para passar no contraste (#135) só
          a deixou mais suja. */}
      <div data-stage>
        <h1 className="font-display tracking-tight">
          {/* saudação em peso e tamanho menores para o nome dominar: o h1
              inteiro continua sendo a frase completa, que é o que leitor
              de tela e buscador recebem */}
          <span className="block font-sans text-lg font-normal opacity-70 sm:text-xl">
            {t('greeting')}
          </span>
          <span data-scramble className="block text-5xl font-black sm:text-7xl">
            {profile.name}
          </span>
        </h1>

        {/* prompt fora do bloco que gira, cursor dentro dele: todas as
            frases começam na mesma margem, então o ">" pode ficar fixo */}
        <p className="mt-3 flex items-baseline gap-2 font-mono text-base sm:text-lg">
          <span aria-hidden="true" className="text-highlight-green">
            &gt;
          </span>
          {/* profile.headline é sempre a primeira: é a identidade (e o
              que o leitor de tela recebe). As outras saem do i18n --
              são copy de marketing, não dado de perfil. */}
          <RotatingHeadline
            messages={[profile.headline, ...t.raw('taglines')]}
            className="text-accent"
            showCursor
          />
        </p>
      </div>

      {/* flex-wrap: com o CTA, os dois círculos sociais e o de rolar, a
          linha não cabe inteira num viewport de 375px */}
      <div data-stage className="flex flex-wrap items-center gap-3">
        {profile.cvUrl ? (
          // <a download>, não <Link>: o destino é um arquivo estático em
          // public/, não uma rota do app -- o roteador do Next não tem o que
          // resolver nele, e o navegador cuida do diálogo de salvar. Mesma
          // escolha do cv-download-button.tsx.
          //
          // Sem seta aqui: o círculo ao lado já usa "↓" para rolar a página,
          // e a mesma seta com dois significados na mesma linha confunde.
          <a href={profile.cvUrl} download className={ctaClassName}>
            {t('cta')}
          </a>
        ) : (
          // Sem CV publicado o botão daria 404, e a doutrina do profile.ts é
          // não emitir link morto -- mas o hero também não pode ficar sem
          // ação principal, então cai para /projetos, que sempre existe.
          <Link href="/projetos" className={ctaClassName}>
            {t('ctaProjects')}
          </Link>
        )}

        <HeroSocialLinks />

        <button
          type="button"
          onClick={scrollToNext}
          aria-label={t('scrollHint')}
          // hover:text-black alongside hover:bg-highlight-red (#135
          // contrast audit): the arrow's default text color is
          // --foreground, which against a solid highlight-red hover
          // background measures ~2.3:1 -- under WCAG AA's 4.5:1 even
          // though it's an aria-hidden glyph (aria-hidden hides it from
          // assistive tech, not from sighted eyes, so the contrast rule
          // still applies). Black on that red is ~5.6:1.
          className="border-highlight-red hover:bg-highlight-red hover:text-black flex size-11 items-center justify-center rounded-full border transition-colors"
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  );
}
