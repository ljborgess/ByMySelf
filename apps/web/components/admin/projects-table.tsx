import type { ProjectStatus } from '@portfolio/shared';
import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/navigation';
import type { AdminProject } from '../../lib/admin-projects';

/**
 * Cor por status, não só texto. Um painel com três status escritos em cinza
 * obriga a ler cada linha; a diferença visual é o que faz "arquivado" saltar
 * numa lista de vinte (user story 2).
 *
 * Escolhidas para funcionar nos dois temas e não depender só de matiz —
 * arquivado é o único com fundo neutro, então continua distinguível para quem
 * não separa verde de âmbar.
 */
const STATUS_STYLES: Record<ProjectStatus, string> = {
  completed:
    'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  in_progress:
    'border-amber-600/30 bg-amber-600/10 text-amber-800 dark:text-amber-300',
  archived:
    'border-black/15 bg-black/5 text-black/60 dark:border-white/15 dark:bg-white/5 dark:text-white/50',
};

/**
 * Split out of page.tsx pelo mesmo motivo de ProjectsList na épica #4:
 * Next.js não suporta testar `async` Server Components, então a página fica
 * um invólucro fino do fetch e tudo que renderiza vive aqui, como componente
 * comum e testável.
 *
 * Os quatro estados de uma tela de dados são explícitos: carregando fica em
 * loading.tsx (o Next cuida), e erro, vazio e conteúdo estão aqui — nenhum
 * deles cai no outro.
 */
export function AdminProjectsTable({
  projects,
  failed,
  newProjectPath,
  editPathFor,
}: {
  projects: AdminProject[];
  failed: boolean;
  newProjectPath: string;
  editPathFor: (project: AdminProject) => string;
}) {
  const t = useTranslations('adminProjects');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

        {/* Ponto de entrada para criar sem precisar decorar URL (user story 3) */}
        <Link
          href={newProjectPath}
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/50"
        >
          {t('create')}
        </Link>
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t('error')}
        </p>
      ) : projects.length === 0 ? (
        /*
          Estado vazio distinto de erro e de carregando: "nenhum projeto ainda"
          é informação, "não deu para carregar" é problema, e uma tabela vazia
          não diz qual dos dois aconteceu.
        */
        <div className="rounded-lg border border-dashed border-black/15 p-8 text-center dark:border-white/20">
          <p className="text-sm opacity-70">{t('empty')}</p>
          <Link
            href={newProjectPath}
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            {t('emptyAction')}
          </Link>
        </div>
      ) : (
        // overflow-x no container e não no body: a tabela é larga em telas
        // pequenas, e a página inteira rolando lateralmente é pior
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/15">
                <th className="px-4 py-3 font-medium">{t('columns.title')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.slug')}</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">{t('columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{project.title.pt}</span>
                    {project.featured && (
                      <span className="ml-2 rounded-full border border-current px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase opacity-70">
                        {t('featured')}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                    >
                      {t(`status.${project.status}`)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <code className="text-xs opacity-70">{project.slug}</code>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {/*
                      Nome acessível carrega o título do projeto: numa tabela
                      de vinte linhas, vinte links chamados "Editar" são
                      indistinguíveis para quem navega por lista de links.
                    */}
                    <Link
                      href={editPathFor(project)}
                      aria-label={t('editNamed', { title: project.title.pt })}
                      className="underline underline-offset-4 hover:opacity-70"
                    >
                      {t('edit')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
