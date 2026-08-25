'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '../../i18n/navigation';
import { useState } from 'react';
import { login, type LoginResult } from '../../lib/auth';

/**
 * RF-AUT1. Formulário de login do painel.
 *
 * Tailwind escrito à mão, como as outras oito páginas do projeto. A issue
 * menciona "the project shadcn/ui components", mas shadcn/ui não existe aqui
 * — nem as dependências nem `components.json`. Instalá-lo para um único
 * formulário traria radix, cva, clsx e tailwind-merge e um segundo idioma de
 * estilo, dentro de uma issue de tela de login. Ver o MR.
 *
 * Client component porque precisa de estado (erro, carregando) e de disparar
 * o fetch com os cookies do browser.
 */
export function LoginForm({ dashboardPath }: { dashboardPath: string }) {
  const t = useTranslations('adminLogin');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<LoginResult & { ok: false }>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Uma tentativa por vez. Sem isso um clique duplo numa rede lenta gasta
    // duas do orçamento de rate limit da própria pessoa.
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFailure(undefined);

    const result = await login(email, password);

    if (result.ok) {
      // `router.replace` e não `push`: o botão "voltar" depois de entrar não
      // deve trazer a pessoa de volta ao formulário de login.
      router.replace(dashboardPath);
      return;
    }

    setFailure(result);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
          className="focus-visible:border-accent rounded-md border border-black/15 px-3 py-2 text-sm outline-none disabled:opacity-60 dark:border-white/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
          className="focus-visible:border-accent rounded-md border border-black/15 px-3 py-2 text-sm outline-none disabled:opacity-60 dark:border-white/20"
        />
      </div>

      {failure && (
        // `role="alert"` para que um leitor de tela anuncie a falha sem a
        // pessoa ter que voltar procurando o que mudou na página
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t(`errors.${failure.reason}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="hover:border-accent mt-2 rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 dark:border-white/20"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
