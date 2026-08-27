import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';

/**
 * Marcas oficiais do GitHub e do LinkedIn. SVG inline em vez de biblioteca
 * de ícones: são dois ícones fixos, e nenhuma dependência nova se paga por
 * isso.
 *
 * `aria-hidden` em cada `<svg>` -- o nome acessível de cada link vem do
 * `aria-label` no `<a>`, e um SVG anunciado junto só duplicaria.
 */
const ICONS = {
  github: (
    <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
  ),
  linkedin: (
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
  ),
};

/**
 * Botões circulares ao lado do CTA do hero (pedido do dono, 2026-08-26):
 * GitHub e LinkedIn.
 *
 * Sem círculo de currículo: o CTA branco ao lado passou a ser "Baixar CV"
 * (2026-08-26), e dois controles vizinhos apontando para o mesmo PDF só
 * duplicam o link -- inclusive na lista de links do leitor de tela.
 *
 * Cada um só aparece se tiver endereço -- `profile.links` é nulável, e o
 * projeto já trata link sem destino como link que não existe (ver
 * site-footer.tsx e cv-download-button.tsx): um botão que dá 404 faz o
 * visitante culpar o site em vez de concluir que não há nada ali.
 *
 * Borda neutra em vez do vermelho sólido do botão de rolar: aquele é a
 * afordância principal do hero e continua sendo o único círculo vermelho.
 * A borda neutra também evita o problema de contraste que o preenchimento
 * vermelho teve na auditoria (#135).
 */
export function HeroSocialLinks() {
  const t = useTranslations('hero.social');

  const circleClassName =
    'hover:border-accent hover:text-accent flex size-11 items-center justify-center rounded-full border border-white/30 transition-colors';

  return (
    <>
      {profile.links.github && (
        <a
          href={profile.links.github}
          target="_blank"
          // noreferrer junto de noopener: sem ele a página de destino
          // ainda descobre de onde o visitante veio
          rel="noopener noreferrer"
          aria-label={t('github')}
          className={circleClassName}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5"
          >
            {ICONS.github}
          </svg>
        </a>
      )}

      {profile.links.linkedin && (
        <a
          href={profile.links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('linkedin')}
          className={circleClassName}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5"
          >
            {ICONS.linkedin}
          </svg>
        </a>
      )}
    </>
  );
}
