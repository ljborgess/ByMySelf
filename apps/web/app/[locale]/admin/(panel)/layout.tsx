import { getTranslations } from 'next-intl/server';
import { LogoutButton } from '../../../../components/admin/logout-button';
import { Link } from '../../../../i18n/navigation';

/**
 * Enquadramento das telas do painel que exigem sessão.
 *
 * Route group, e não uma pasta de verdade: `(panel)` não aparece na URL, e
 * `/admin/projects` continua sendo `/admin/projects`. Existe pelo mesmo
 * motivo de `(site)` na épica anterior — separar o que herda um
 * enquadramento do que não herda. A tela de login fica fora, e é o que
 * importa: um botão "Sair" acima do formulário de entrar não faz sentido.
 *
 * A barra é o lugar que o layout de `/admin` já previa em comentário para
 * quando houvesse navegação entre seções. Ainda há uma seção só, então o que
 * entra por ora é a identificação do painel e a saída.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('adminSession');

  return (
    <div className="flex flex-1 flex-col">
      {/*
        `banner` implícito no `header` só vale quando ele não está aninhado em
        outro landmark — aqui é filho direto do container do painel, então
        vale.
      */}
      <header className="border-b border-white/15">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/*
            Leva à listagem, que é a raiz do painel. Não é o logotipo do site
            público: daqui não se navega para o portfólio sem sair do trabalho.
          */}
          <Link
            href="/admin/projects"
            className="text-sm font-semibold tracking-tight hover:opacity-70"
          >
            {t('panel')}
          </Link>

          <LogoutButton loginPath="/admin/login" />
        </div>
      </header>

      {children}
    </div>
  );
}
