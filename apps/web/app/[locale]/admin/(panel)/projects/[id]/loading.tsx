import { useTranslations } from 'next-intl';

/**
 * O estado "carregando" da tela de edição.
 *
 * Existe porque `loading.tsx` embrulha em Suspense a página do segmento *e
 * todos os segmentos abaixo dele*: sem este arquivo, quem abre
 * `/admin/projects/:id` veria o esqueleto de `projects/loading.tsx`, que
 * desenha uma tabela sob o título "Projetos" — a forma da tela de onde a
 * pessoa acabou de sair, não a que está chegando.
 *
 * A página é `async` (busca o projeto pelo id), então não há estado de
 * cliente para "carregando": quem cuida disso é o Next enquanto o fetch
 * resolve.
 *
 * Esqueleto e não spinner, pela mesma razão da listagem: mostra a forma do
 * que vem, então a página não salta quando o conteúdo chega.
 */
export default function Loading() {
  const t = useTranslations('adminProjectForm');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('editTitle')}
      </h1>

      {/*
        `aria-busy` com texto só para leitor de tela: o esqueleto comunica
        visualmente, mas sem isto quem usa leitor ouviria silêncio.
      */}
      <div
        aria-busy="true"
        aria-live="polite"
        className="mt-8 flex flex-col gap-6"
      >
        <span className="sr-only">{t('loading')}</span>
        {[0, 1, 2, 3].map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </main>
  );
}
