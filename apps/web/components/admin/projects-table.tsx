'use client';

import { useState } from 'react';
import type { ProjectStatus } from '@portfolio/shared';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '../../i18n/navigation';
import type { AdminProject } from '../../lib/admin-projects';
import { deleteProject, reorderProject } from '../../lib/admin-projects-client';
import { ConfirmDialog } from './confirm-dialog';

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
  completed: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-300',
  in_progress: 'border-amber-600/30 bg-amber-600/10 text-amber-300',
  archived: 'border-white/15 bg-white/5 text-white/50',
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
 *
 * Client component desde a #26: excluir e reordenar mudam a lista na hora,
 * sem recarregar a página (user stories 2 e 3), e isso é estado. A lista que
 * chega por prop é só a semente — daí em diante quem manda é o estado local,
 * atualizado pelo que a API responde.
 *
 * `editPathPrefix` é string e não a função `editPathFor` que existia antes:
 * função não atravessa a fronteira de serialização entre Server e Client
 * Component, e este componente passou para o lado do cliente.
 */
export function AdminProjectsTable({
  projects: initialProjects,
  failed,
  newProjectPath,
  editPathPrefix,
  loginPath,
}: {
  projects: AdminProject[];
  failed: boolean;
  newProjectPath: string;
  editPathPrefix: string;
  loginPath: string;
}) {
  const t = useTranslations('adminProjects');
  const router = useRouter();

  const [projects, setProjects] = useState(initialProjects);
  /** A última listagem vinda do servidor, para reconhecer quando chega outra. */
  const [seed, setSeed] = useState(initialProjects);
  /** Projeto aguardando confirmação de exclusão; `undefined` = sem diálogo. */
  const [confirming, setConfirming] = useState<AdminProject>();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string>();

  // Ressincroniza quando o servidor manda uma listagem nova — o padrão do
  // React para ajustar estado quando uma prop muda, comparando durante o
  // render em vez de num efeito.
  //
  // Sem isto o estado local ignoraria toda prop posterior à primeira, e o
  // `router.refresh()` de depois de cada ação buscaria dados frescos que a
  // tabela jogaria fora. É também o que faz a listagem se corrigir sozinha
  // quando ela estava velha.
  if (seed !== initialProjects) {
    setSeed(initialProjects);
    setProjects(initialProjects);
  }

  function handleFailure(
    reason: 'unauthenticated' | 'notFound' | 'unavailable',
  ) {
    if (reason === 'unauthenticated') {
      // Sessão expirada não é erro desta tela: é para reautenticar, e o
      // mesmo caminho que a página usa quando o fetch inicial dá 401.
      router.replace(loginPath);
      return;
    }

    if (reason === 'notFound') {
      // A listagem local está velha — o projeto já não existe do lado da API.
      // Recarregar é o que resolve, e a mensagem só é verdade porque o
      // refresh acontece junto.
      setActionError(t('errors.gone'));
      router.refresh();
      return;
    }

    setActionError(t('errors.actionFailed'));
  }

  async function confirmDelete() {
    const target = confirming;
    if (!target || pending) {
      return;
    }

    setPending(true);
    setActionError(undefined);

    // A linha sai depois da resposta, e não antes como no reordenar. A issue
    // sugere otimista aqui também, mas as duas situações não são iguais: o
    // diálogo continua aberto mostrando "Excluindo…", então já existe
    // resposta visual, e sumir com a linha atrás dele para trazê-la de volta
    // se a chamada falhar é pior que esperar. No reordenar não há diálogo
    // nenhum, e sem a troca imediata o clique pareceria inerte.
    const result = await deleteProject(target.id);

    if (result.ok || result.reason === 'notFound') {
      // `notFound` conta como sucesso: significa que a listagem estava velha
      // e o projeto já não existe. Mostrar erro sobre um projeto que a pessoa
      // queria fora seria discutir com o resultado que ela pediu.
      setProjects((current) =>
        current.filter((project) => project.id !== target.id),
      );
      setConfirming(undefined);
      setPending(false);
      // A listagem do servidor é `no-store`, mas o cache de rota do cliente
      // não sabe disso: sem o refresh, voltar para cá por navegação interna
      // mostraria a linha excluída de novo.
      router.refresh();
      return;
    }

    setPending(false);
    setConfirming(undefined);
    handleFailure(result.reason);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = projects[index];
    const position = index + direction;

    if (pending || !target || position < 0 || position >= projects.length) {
      return;
    }

    setPending(true);
    setActionError(undefined);

    // Otimista: a linha troca de lugar antes da resposta, senão cada clique
    // parece não ter feito nada até a rede voltar.
    //
    // Uma troca com o vizinho é exatamente o que a API calcula para um
    // movimento de uma casa — ela remove o projeto da sequência e o reinsere
    // em `position`, o que para um passo dá o mesmo resultado.
    const previous = projects;
    const optimistic = [...projects];
    optimistic[index] = optimistic[position];
    optimistic[position] = target;
    setProjects(optimistic);

    const result = await reorderProject(target.id, position);

    if (result.ok) {
      // A resposta traz a listagem inteira já reordenada e é a verdade do
      // servidor; a ordem otimista fica só quando o corpo veio inaproveitável.
      setProjects(result.projects ?? optimistic);
      setPending(false);
      router.refresh();
      return;
    }

    // Reverte por inteiro em vez de desfazer a troca: se a chamada falhou, o
    // que vale é o retrato anterior, não uma reconstrução dele.
    setProjects(previous);
    setPending(false);
    handleFailure(result.reason);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

        {/* Ponto de entrada para criar sem precisar decorar URL (user story 3) */}
        <Link
          href={newProjectPath}
          className="hover:border-accent rounded-md border border-white/20 px-4 py-2 text-sm font-medium transition-colors"
        >
          {t('create')}
        </Link>
      </div>

      {/*
        Falha de ação é separada da falha de carregamento: esta some quando a
        próxima tentativa dá certo, e aparece com a tabela ainda na tela.
      */}
      {actionError && (
        <p role="alert" className="text-sm text-red-400">
          {actionError}
        </p>
      )}

      {failed ? (
        <p role="alert" className="text-sm text-red-400">
          {t('error')}
        </p>
      ) : projects.length === 0 ? (
        /*
          Estado vazio distinto de erro e de carregando: "nenhum projeto ainda"
          é informação, "não deu para carregar" é problema, e uma tabela vazia
          não diz qual dos dois aconteceu.
        */
        <div className="rounded-lg border border-dashed border-white/20 p-8 text-center">
          <p className="text-sm opacity-70">{t('empty')}</p>
          <Link
            href={newProjectPath}
            className="hover:text-accent mt-3 inline-block text-sm underline underline-offset-4"
          >
            {t('emptyAction')}
          </Link>
        </div>
      ) : (
        // overflow-x no container e não no body: a tabela é larga em telas
        // pequenas, e a página inteira rolando lateralmente é pior
        <div className="overflow-x-auto rounded-lg border border-white/15">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left">
                <th className="px-4 py-3 font-medium">{t('columns.order')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.title')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.slug')}</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">{t('columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr
                  key={project.id}
                  className="border-b border-white/10 last:border-0"
                >
                  <td className="px-4 py-3">
                    {/*
                      RF-PROJ5. Subir e descer em vez de arrastar: a issue põe
                      os botões como implementação base, e eles funcionam por
                      teclado e por leitor de tela sem nada a mais — o que
                      arrastar não dá de graça.
                    */}
                    <div className="flex gap-1">
                      <MoveButton
                        label={t('moveUpNamed', { title: project.title.pt })}
                        // A primeira linha não tem para onde subir. Desabilitado
                        // e não escondido: um botão que some faz as colunas
                        // dançarem a cada movimento.
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </MoveButton>
                      <MoveButton
                        label={t('moveDownNamed', { title: project.title.pt })}
                        disabled={pending || index === projects.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </MoveButton>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-medium">{project.title.pt}</span>
                    {project.featured && (
                      <span className="text-accent border-accent ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
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
                    <div className="flex justify-end gap-4">
                      {/*
                        Nome acessível carrega o título do projeto: numa tabela
                        de vinte linhas, vinte links chamados "Editar" são
                        indistinguíveis para quem navega por lista de links.
                        Vale igual para excluir, subir e descer.
                      */}
                      <Link
                        href={`${editPathPrefix}/${project.id}`}
                        aria-label={t('editNamed', { title: project.title.pt })}
                        className="hover:text-accent underline underline-offset-4"
                      >
                        {t('edit')}
                      </Link>

                      <button
                        type="button"
                        onClick={() => setConfirming(project)}
                        disabled={pending}
                        aria-label={t('deleteNamed', {
                          title: project.title.pt,
                        })}
                        className="text-red-400 underline underline-offset-4 hover:opacity-70 disabled:opacity-40"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        User story 1: nada é excluído em um clique. O diálogo só monta quando
        há um projeto escolhido, então antes disso não existe caminho nenhum
        até a chamada.
      */}
      {confirming && (
        <ConfirmDialog
          title={t('deleteConfirmTitle')}
          description={t('deleteConfirmDescription', {
            title: confirming.title.pt,
          })}
          confirmLabel={pending ? t('deleting') : t('deleteConfirm')}
          cancelLabel={t('cancel')}
          pending={pending}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(undefined)}
        />
      )}
    </div>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="hover:border-accent rounded border border-white/20 px-2 py-0.5 text-xs leading-none transition-colors disabled:opacity-30"
    >
      {/*
        A seta é decoração: quem usa leitor de tela recebe a mesma informação
        pelo `aria-label`, e ouvir "seta para cima" não diz o que o botão faz.
      */}
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
