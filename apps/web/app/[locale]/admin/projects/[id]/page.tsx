import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locale as localeParam } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { ProjectForm } from '../../../../../components/admin/project-form';
import { profile } from '../../../../../content/profile';
import { Link, redirect } from '../../../../../i18n/navigation';
import { routing } from '../../../../../i18n/routing';
import { getAdminProject } from '../../../../../lib/admin-projects';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminProjectForm');

  return {
    title: `${t('editTitle')} — ${profile.name}`,
    // Mesma decisão do resto do painel: nada aqui interessa a um buscador, e
    // listar a rota só divulga onde o painel fica.
    robots: { index: false, follow: false },
  };
}

/**
 * RF-PROJ2. Rota `/pt/admin/projects/:id`, o destino do link "Editar" da
 * listagem (#24).
 *
 * O projeto é buscado aqui, no servidor, e não pelo formulário: o cookie de
 * sessão é `HttpOnly`, então quem consegue lê-lo é a requisição que chegou
 * no Next. Buscar do cliente exigiria uma segunda ida à API depois do
 * primeiro render, e o formulário abriria vazio antes de preencher.
 *
 * Os três desfechos de falha vão para lugares diferentes de propósito:
 * sessão expirada volta ao login, id inexistente é 404, e API fora é estado
 * de erro na própria tela — dobrar os três num só mostraria "projeto não
 * encontrado" toda vez que o backend piscasse.
 */
export default async function EditAdminProjectPage({
  params,
}: PageProps<'/[locale]/admin/projects/[id]'>) {
  const { id } = await params;
  const t = await getTranslations('adminProjectForm');

  const result = await getAdminProject(id);

  if (!result.ok && result.reason === 'unauthenticated') {
    // Locale da requisição, não fixo: mandar quem está em `/en` para o login
    // em `/pt` trocaria o idioma no meio de um fluxo de autenticação.
    const current = await localeParam();
    redirect({
      href: '/admin/login',
      locale: hasLocale(routing.locales, current)
        ? current
        : routing.defaultLocale,
    });
  }

  if (!result.ok && result.reason === 'notFound') {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('editTitle')}
      </h1>
      <p className="mt-2 mb-8 text-sm opacity-70">{t('editDescription')}</p>

      {result.ok ? (
        <ProjectForm
          project={result.project}
          dashboardPath="/admin/projects"
          loginPath="/admin/login"
        />
      ) : (
        /*
          Sobrou o caso `failed`. Um formulário vazio aqui seria pior que um
          erro: parece um projeto sem dados, e salvar apagaria o que existe.
        */
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {t('loadError')}
          </p>
          <Link
            href="/admin/projects"
            className="text-sm underline underline-offset-4 hover:opacity-70"
          >
            {t('backToList')}
          </Link>
        </div>
      )}
    </main>
  );
}
