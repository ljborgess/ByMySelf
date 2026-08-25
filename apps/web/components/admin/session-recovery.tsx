'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../i18n/navigation';
import { refreshSession } from '../../lib/auth';

/**
 * Renova a sessão e recarrega a página, sem passar pelo login.
 *
 * Existe por uma restrição do Next: só Route Handler e Server Action podem
 * gravar cookie, e as leituras do painel acontecem em Server Component. Então
 * quando o access token vence — 15 minutos, contra 30 dias do refresh —, o
 * servidor não tem como renovar sozinho. O que ele consegue é reconhecer o
 * estado (`recoverable`) e delegar ao cliente, que é aqui.
 *
 * Antes disso, esse mesmo estado mandava a pessoa para o login: era o painel
 * expulsando a cada quinze minutos com uma sessão válida por semanas.
 *
 * Renovou, `router.refresh()` refaz o Server Component, agora com o cookie
 * novo. Não renovou, não há sessão a recuperar e o login é o destino certo.
 */
export function SessionRecovery({ loginPath }: { loginPath: string }) {
  const t = useTranslations('adminSession');
  const router = useRouter();

  // O StrictMode do React monta o efeito duas vezes em desenvolvimento.
  // `refreshSession` já compartilha a chamada em voo, então não haveria
  // rotação concorrente — mas isto evita a segunda navegação.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    let cancelled = false;

    void refreshSession().then((result) => {
      if (cancelled) {
        return;
      }
      if (result.ok) {
        router.refresh();
        return;
      }
      // `unavailable` também vai para o login. A alternativa seria ficar
      // nesta tela repetindo, e uma tela que só diz "restaurando" para sempre
      // é pior que uma tela de login que a pessoa sabe usar.
      router.replace(loginPath);
    });

    return () => {
      cancelled = true;
    };
  }, [router, loginPath]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      {/*
        `aria-live` porque a tela troca sozinha quando a renovação termina:
        sem isso quem usa leitor de tela ouviria silêncio durante a espera e
        depois se veria noutra página sem explicação.
      */}
      <p
        aria-live="polite"
        aria-busy="true"
        className="text-sm text-black/70 dark:text-white/70"
      >
        {t('restoring')}
      </p>
    </main>
  );
}
