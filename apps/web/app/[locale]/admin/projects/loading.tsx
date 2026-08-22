import { useTranslations } from 'next-intl';

/**
 * O quarto estado da tela de dados: carregando.
 *
 * Existe como arquivo separado porque a página é um `async` Server Component
 * — não há estado de cliente para "carregando", quem cuida disso é o Next
 * enquanto o fetch resolve. Sem este arquivo a navegação fica parada na tela
 * anterior, e a pessoa não sabe se o clique funcionou.
 *
 * Esqueleto e não spinner: mostra a forma do que vem, então a página não
 * salta quando o conteúdo chega.
 */
export default function Loading() {
  const t = useTranslations('adminProjects');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      </div>

      {/*
        `aria-busy` com texto só para leitor de tela: o esqueleto comunica
        visualmente, mas sem isso quem usa leitor ouviria silêncio.
      */}
      <div
        aria-busy="true"
        aria-live="polite"
        className="rounded-lg border border-black/10 dark:border-white/15"
      >
        <span className="sr-only">{t('loading')}</span>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-black/5 px-4 py-4 last:border-0 dark:border-white/10"
          >
            <div className="h-4 w-1/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
