'use client';

import { useCallback, useEffect, useId, useRef } from 'react';

/**
 * Diálogo de confirmação para ação destrutiva.
 *
 * A issue sugere o AlertDialog do shadcn/ui, que não existe neste projeto —
 * nem as dependências nem `components.json`, como o LoginForm (#23) já
 * registrou. Instalá-lo por um diálogo traria radix, cva, clsx e
 * tailwind-merge e um segundo idioma de estilo. Aqui é Tailwind à mão, como
 * as outras telas.
 *
 * `<dialog>` nativo daria trap de foco e Escape de graça, mas `showModal()`
 * não é implementado de forma confiável em jsdom, e a issue pede teste de
 * componente para justamente este fluxo. Um diálogo que não dá para testar
 * não serve, então o comportamento é explícito aqui.
 *
 * `role="alertdialog"` e não `dialog`: a diferença é que o leitor de tela
 * anuncia a descrição junto do título ao abrir, em vez de deixar a pessoa
 * descobrir o texto navegando. Para "isto vai excluir um projeto", ouvir o
 * aviso antes de encontrar o botão é o ponto.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Enquanto a chamada está no ar: bloqueia repetição e fechar por engano. */
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Ids gerados e não fixos: hoje só um diálogo fica montado por vez, mas um
  // id fixo transformaria um segundo diálogo num bug silencioso — dois
  // elementos com o mesmo id, e o `aria-labelledby` apontando para o errado.
  const titleId = useId();
  const descriptionId = useId();

  // Quem tinha o foco antes de abrir, para devolvê-lo ao fechar. Sem isso o
  // foco volta para o começo do documento, e quem navega por teclado recomeça
  // a tabular a página inteira para voltar à linha onde estava.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const requestCancel = useCallback(() => {
    // Fechar no meio da chamada deixaria a exclusão acontecendo sem nada na
    // tela dizendo isso.
    if (!pending) {
      onCancel();
    }
  }, [pending, onCancel]);

  useEffect(() => {
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // O foco vai para "Cancelar", não para o botão destrutivo: quem confirma
    // com Enter logo após abrir não pode acabar excluindo por reflexo.
    cancelRef.current?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      // Trap de foco. `aria-modal="true"` afirma que o resto da página está
      // inerte; sem prender o Tab, a afirmação seria falsa e a tabulação
      // sairia para a tabela atrás do diálogo.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      );
      if (!focusable || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [requestCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      // Clicar fora cancela, que é o gesto esperado — mas só no fundo, não em
      // qualquer clique que borbulhe de dentro do painel.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestCancel();
        }
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-lg border border-black/10 bg-white p-6 shadow-lg dark:border-white/15 dark:bg-neutral-900"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm opacity-70">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={requestCancel}
            disabled={pending}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:border-black/40 disabled:opacity-60 dark:border-white/20 dark:hover:border-white/50"
          >
            {cancelLabel}
          </button>

          {/*
            Vermelho preenchido, e não só uma borda: é o botão que apaga, e
            precisa se distinguir do que cancela sem depender de ler os dois.
          */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
