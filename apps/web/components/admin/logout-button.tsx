'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../i18n/navigation';
import { logout } from '../../lib/auth';

/**
 * RF-AUT1. Encerra a sessão.
 *
 * A rota `/auth/logout` existia desde a épica de autenticação sem nada na
 * tela que a chamasse — então a única forma de encerrar era esperar o refresh
 * token vencer, trinta dias depois. Numa máquina emprestada isso é exposição
 * real, e não havia botão nenhum a apertar.
 *
 * Nenhum token é tocado aqui: a API revoga o refresh e limpa os dois cookies
 * pelo `Set-Cookie` da resposta. `credentials: 'include'`, dentro de
 * `lib/auth.ts`, é o que faz o browser mandar o cookie a revogar.
 */
export function LogoutButton({ loginPath }: { loginPath: string }) {
  const t = useTranslations('adminSession');
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleClick() {
    if (leaving) {
      return;
    }
    setLeaving(true);

    await logout();

    // Vai para o login mesmo se a revogação falhar. O cookie pode ter
    // sobrevivido, mas continuar num painel de uma sessão que a pessoa mandou
    // encerrar é pior que sair — e o caminho para tentar de novo é justamente
    // entrar e sair outra vez.
    router.replace(loginPath);
    // Sem isto, o cache de rota do cliente guardaria as telas do painel já
    // renderizadas, e voltar mostraria dados de uma sessão encerrada.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={leaving}
      className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-black/40 disabled:opacity-60 dark:border-white/20 dark:hover:border-white/50"
    >
      {leaving ? t('leaving') : t('logout')}
    </button>
  );
}
