import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProjectForm } from '../../../../../components/admin/project-form';
import { profile } from '../../../../../content/profile';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminProjectForm');

  return {
    title: `${t('createTitle')} — ${profile.name}`,
    // Mesma decisão do resto do painel: nada aqui interessa a um buscador, e
    // listar a rota só divulga onde o painel fica.
    robots: { index: false, follow: false },
  };
}

/**
 * RF-PROJ1. Rota `/pt/admin/projects/novo`, o destino do botão "Novo projeto"
 * da listagem (#24).
 *
 * Segmento estático ao lado de `[id]`: o Next resolve o estático primeiro,
 * então `novo` nunca é lido como id de projeto.
 *
 * Server component fino, como as outras telas do painel: só texto e
 * enquadramento. O formulário é client component porque precisa de estado e
 * do fetch com os cookies do browser.
 *
 * Não há fetch aqui, e por isso não há verificação de sessão: o proxy já
 * barra `/admin/*` sem cookie, e a API é quem valida de verdade quando o
 * formulário envia — um 401 ali leva a pessoa para o login.
 */
export default async function NewAdminProjectPage() {
  const t = await getTranslations('adminProjectForm');

  return (
    // `main` por página e não no layout do painel, pela mesma razão da
    // listagem. Largura menor que a da tabela: um formulário de campo único
    // por linha esticado até 6xl obriga a varrer a tela para ligar rótulo e
    // campo.
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('createTitle')}
      </h1>
      <p className="mt-2 mb-8 text-sm opacity-70">{t('createDescription')}</p>

      {/*
        Os caminhos vêm de fora para o formulário não precisar conhecer a
        estrutura de rotas — a mesma decisão que a tela de login tomou com
        `dashboardPath`.
      */}
      <ProjectForm dashboardPath="/admin/projects" loginPath="/admin/login" />
    </main>
  );
}
