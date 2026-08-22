import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '../../../../components/admin/login-form';
import { profile } from '../../../../content/profile';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminLogin');

  return {
    title: `${t('title')} — ${profile.name}`,
    // Fora do index: a tela de login do painel não tem nada a oferecer a um
    // buscador, e listá-la só divulga onde o painel fica. O robots.txt já
    // bloqueia `/*/admin`; isto é a mesma decisão no nível da página, para o
    // caso de alguém chegar por link direto.
    robots: { index: false, follow: false },
  };
}

/**
 * RF-AUT1. Rota `/pt/admin/login`.
 *
 * Fica fora do route group `(site)`, então não herda header nem footer do
 * portfólio — a navegação pública acima de um formulário de login anuncia as
 * rotas do site para quem está tentando entrar.
 *
 * Server component fino: só o texto e o enquadramento. O formulário é client
 * component porque precisa de estado e do fetch com os cookies do browser.
 */
export default async function AdminLoginPage() {
  const t = await getTranslations('adminLogin');

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-2 mb-8 text-sm opacity-70">{t('description')}</p>

      {/*
        O destino pós-login é passado de fora para que o formulário não
        precise conhecer a estrutura de rotas. Passou a apontar para a lista
        de projetos quando ela nasceu (#24) — antes ia para `/admin`, que não
        existia.
      */}
      <LoginForm dashboardPath="/admin/projects" />
    </main>
  );
}
