import type { Metadata } from 'next';
import { locale as localeParam } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '../../../../../i18n/routing';
import { AdminProjectsTable } from '../../../../../components/admin/projects-table';
import { SessionRecovery } from '../../../../../components/admin/session-recovery';
import { profile } from '../../../../../content/profile';
import { redirect } from '../../../../../i18n/navigation';
import {
  getAdminProjects,
  type AdminProject,
} from '../../../../../lib/admin-projects';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminProjects');

  return {
    title: `${t('title')} — ${profile.name}`,
    // Mesma decisão da tela de login: o painel não tem nada a oferecer a um
    // buscador, e listá-lo só divulga onde ele fica.
    robots: { index: false, follow: false },
  };
}

/**
 * RF-PROJ4. Painel de projetos.
 *
 * Server component fino, como as páginas públicas: o fetch e a decisão de
 * redirecionar ficam aqui, e tudo que renderiza vive em AdminProjectsTable,
 * que é testável (Next não suporta testar `async` Server Components).
 *
 * Sessão expirada redireciona para o login em vez de mostrar erro. O refresh
 * de token não pode acontecer aqui: só Route Handler e Server Action podem
 * gravar cookie, e um server component não. Mandar para o login é o caminho
 * honesto — e o `401` em `/auth/refresh` já significa reautenticar, não
 * repetir (ver README).
 *
 * `redirect` vem de i18n/navigation e não de next/navigation, para o destino
 * sair com o prefixo de locale em vez de forçar um segundo redirect.
 */
export default async function AdminProjectsPage() {
  const result = await getAdminProjects();

  // Access token vencido com refresh ainda válido: renova em silêncio e
  // recarrega, em vez de mandar para o login. Sem isto o painel expulsava a
  // cada quinze minutos com uma sessão boa por trinta dias.
  if (!result.ok && result.reason === 'recoverable') {
    return <SessionRecovery loginPath="/admin/login" />;
  }

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

  const projects: AdminProject[] = result.ok ? result.projects : [];

  return (
    // O `main` é declarado aqui e não no layout do painel: a tela de login tem
    // o dela, e um `main` no layout aninharia os dois. A largura também é por
    // página — a tabela tem quatro colunas e apertá-la em 5xl forçaria rolagem
    // lateral onde ela cabe.
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      {/*
        Caminhos como string, não como função: desde a #26 a tabela é client
        component, e função não atravessa a fronteira de serialização entre
        Server e Client Component.
      */}
      <AdminProjectsTable
        projects={projects}
        failed={!result.ok}
        newProjectPath="/admin/projects/novo"
        editPathPrefix="/admin/projects"
        loginPath="/admin/login"
      />
    </main>
  );
}
