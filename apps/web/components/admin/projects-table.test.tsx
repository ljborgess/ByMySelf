import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import { makeAdminProject as project } from '../../lib/admin-project.fixture';
import type { AdminProject } from '../../lib/admin-projects';
import { deleteProject, reorderProject } from '../../lib/admin-projects-client';
import { AdminProjectsTable } from './projects-table';

jest.mock('../../lib/admin-projects-client', () => ({
  deleteProject: jest.fn(),
  reorderProject: jest.fn(),
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock('../../i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={`/pt${href}`} {...props}>
      {children}
    </a>
  ),
}));

const mockDelete = deleteProject as jest.MockedFunction<typeof deleteProject>;
const mockReorder = reorderProject as jest.MockedFunction<
  typeof reorderProject
>;

const admin = messages.adminProjects;

function renderTable(projects: AdminProject[], failed = false) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <AdminProjectsTable
        projects={projects}
        failed={failed}
        newProjectPath="/admin/projects/novo"
        editPathPrefix="/admin/projects"
        loginPath="/admin/login"
      />
    </NextIntlClientProvider>,
  );
}

/** Os títulos das linhas, na ordem em que a tabela as está mostrando. */
function renderedOrder(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent ?? '');
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('AdminProjectsTable', () => {
  it('renders one row per project', () => {
    renderTable([
      project({ id: 'a', slug: 'primeiro', title: { pt: 'Primeiro' } }),
      project({ id: 'b', slug: 'segundo', title: { pt: 'Segundo' } }),
    ]);

    expect(screen.getAllByRole('row')).toHaveLength(3); // cabeçalho + 2
    expect(screen.getByText('Primeiro')).toBeVisible();
    expect(screen.getByText('Segundo')).toBeVisible();
  });

  /**
   * User story 1 e 2. Arquivado tem que aparecer na lista — é justamente o
   * status que o site público esconde, e o painel existe para dar visibilidade
   * independente do que está público.
   */
  it.each([
    ['in_progress', messages.adminProjects.status.in_progress],
    ['completed', messages.adminProjects.status.completed],
    ['archived', messages.adminProjects.status.archived],
  ] as const)('shows the %s status as a label', (status, label) => {
    renderTable([project({ status })]);

    expect(screen.getByText(label)).toBeVisible();
  });

  it('lists an archived project alongside the others', () => {
    renderTable([
      project({ id: 'a', title: { pt: 'Ativo' }, status: 'completed' }),
      project({ id: 'b', title: { pt: 'Antigo' }, status: 'archived' }),
    ]);

    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('Antigo')).toBeVisible();
  });

  it('marks a featured project', () => {
    renderTable([project({ featured: true })]);

    expect(screen.getByText(messages.adminProjects.featured)).toBeVisible();
  });

  it('does not mark a regular project as featured', () => {
    renderTable([project({ featured: false })]);

    expect(
      screen.queryByText(messages.adminProjects.featured),
    ).not.toBeInTheDocument();
  });

  it('offers a way to create a project (user story 3)', () => {
    renderTable([project()]);

    expect(
      screen.getByRole('link', { name: messages.adminProjects.create }),
    ).toHaveAttribute('href', '/pt/admin/projects/novo');
  });

  it('links each row to that project edit form (user story 4)', () => {
    renderTable([project({ id: 'abc', title: { pt: 'Meu Projeto' } })]);

    expect(
      screen.getByRole('link', { name: 'Editar Meu Projeto' }),
    ).toHaveAttribute('href', '/pt/admin/projects/abc');
  });

  /**
   * Numa tabela de vinte linhas, vinte links chamados "Editar" são
   * indistinguíveis para quem navega por lista de links — o nome acessível
   * tem que carregar de qual projeto se trata.
   */
  it('gives each edit link an accessible name carrying the project title', () => {
    renderTable([
      project({ id: 'a', title: { pt: 'Alpha' } }),
      project({ id: 'b', title: { pt: 'Beta' } }),
    ]);

    expect(screen.getByRole('link', { name: 'Editar Alpha' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editar Beta' })).toBeVisible();
  });

  describe('os quatro estados da tela de dados', () => {
    it('renders a distinct empty state, not an empty table', () => {
      renderTable([]);

      expect(screen.getByText(messages.adminProjects.empty)).toBeVisible();
      // uma tabela vazia não diz se não há projetos ou se algo falhou
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('offers a way out of the empty state', () => {
      renderTable([]);

      expect(
        screen.getByRole('link', { name: messages.adminProjects.emptyAction }),
      ).toBeVisible();
    });

    it('renders an error state instead of the list when the fetch failed', () => {
      renderTable([], true);

      expect(screen.getByRole('alert')).toHaveTextContent(
        messages.adminProjects.error,
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('does not mistake a failure for an empty list', () => {
      // são coisas diferentes: "você não tem projetos" versus "não deu para
      // saber quais são os seus projetos"
      renderTable([], true);

      expect(
        screen.queryByText(messages.adminProjects.empty),
      ).not.toBeInTheDocument();
    });

    it('keeps the create button reachable even when loading failed', () => {
      // ficar sem saída porque a listagem caiu seria pior que o próprio erro
      renderTable([], true);

      expect(
        screen.getByRole('link', { name: messages.adminProjects.create }),
      ).toBeVisible();
    });
  });
});

describe('excluir um projeto (RF-PROJ3)', () => {
  const alpha = project({ id: 'a', title: { pt: 'Alpha' } });
  const beta = project({ id: 'b', title: { pt: 'Beta' } });

  function deleteButton(title: string) {
    return screen.getByRole('button', { name: `Excluir ${title}` });
  }

  function confirmButton() {
    return within(screen.getByRole('alertdialog')).getByRole('button', {
      name: admin.deleteConfirm,
    });
  }

  it('offers a delete control per row, named with the project it removes', () => {
    renderTable([alpha, beta]);

    expect(deleteButton('Alpha')).toBeVisible();
    expect(deleteButton('Beta')).toBeVisible();
  });

  /** User story 1: nada é excluído em um clique. */
  it('asks for confirmation and does not call the API on the first click', async () => {
    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent(admin.deleteConfirmTitle);
    // o nome do projeto está no aviso: confirmar sem saber qual linha foi
    // clicada é justamente o erro que o diálogo existe para evitar
    expect(dialog).toHaveTextContent('Alpha');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('backs out without calling the API when cancelled', async () => {
    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));
    await user.click(screen.getByRole('button', { name: admin.cancel }));

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Alpha')).toBeVisible();
  });

  it('closes on Escape, which is the reflex for backing out of a dialog', async () => {
    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });

  /**
   * O foco vai para "Cancelar" e não para o botão que apaga: quem confirma
   * com Enter logo após abrir não pode acabar excluindo por reflexo.
   */
  it('opens with the focus on cancel, not on the destructive button', async () => {
    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: admin.cancel })).toHaveFocus(),
    );
  });

  it('calls the API for the confirmed project only after confirmation', async () => {
    mockDelete.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(deleteButton('Beta'));
    await user.click(confirmButton());

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('b'));
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  /** User story 2: confirmação visual sem recarregar a página. */
  it('drops the row from the list on success', async () => {
    mockDelete.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(deleteButton('Alpha'));
    await user.click(confirmButton());

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(screen.getByText('Beta')).toBeVisible();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // sem o refresh, voltar para cá por navegação interna traria a linha
    // excluída de volta pelo cache de rota do cliente
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('keeps the row and explains itself when the call fails', async () => {
    mockDelete.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(deleteButton('Alpha'));
    await user.click(confirmButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      admin.errors.actionFailed,
    );
    // a linha só sai depois de a API confirmar, então uma exclusão que falhou
    // deixa a tabela exatamente como estava
    expect(screen.getByText('Alpha')).toBeVisible();
    expect(renderedOrder()).toEqual(['Alpha', 'Beta']);
  });

  /**
   * 404 significa que a listagem estava velha e o projeto já não existe. O
   * resultado que a pessoa pediu já vale, então discutir com ela seria pior
   * que sumir com a linha.
   */
  it('treats an already-deleted project as done, not as a failure', async () => {
    mockDelete.mockResolvedValue({ ok: false, reason: 'notFound' });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(deleteButton('Alpha'));
    await user.click(confirmButton());

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends an expired session to the login instead of showing an error', async () => {
    mockDelete.mockResolvedValue({ ok: false, reason: 'unauthenticated' });

    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));
    await user.click(confirmButton());

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not fire a second delete when confirmed twice quickly', async () => {
    mockDelete.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderTable([alpha]);

    await user.click(deleteButton('Alpha'));
    await user.click(confirmButton());
    await user.click(screen.getByRole('button', { name: admin.deleting }));

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

describe('reordenar projetos (RF-PROJ5)', () => {
  const alpha = project({ id: 'a', title: { pt: 'Alpha' } });
  const beta = project({ id: 'b', title: { pt: 'Beta' } });
  const gama = project({ id: 'c', title: { pt: 'Gama' } });

  function moveUp(title: string) {
    return screen.getByRole('button', { name: `Mover ${title} para cima` });
  }

  function moveDown(title: string) {
    return screen.getByRole('button', { name: `Mover ${title} para baixo` });
  }

  it('offers move controls per row, named with the project they move', () => {
    renderTable([alpha, beta]);

    expect(moveUp('Beta')).toBeVisible();
    expect(moveDown('Alpha')).toBeVisible();
  });

  /**
   * Desabilitado e não escondido: um botão que some faz as colunas dançarem a
   * cada movimento, e a linha de destino muda de lugar debaixo do cursor.
   */
  it('disables the moves that have nowhere to go', () => {
    renderTable([alpha, beta, gama]);

    expect(moveUp('Alpha')).toBeDisabled();
    expect(moveDown('Gama')).toBeDisabled();
    expect(moveDown('Alpha')).toBeEnabled();
    expect(moveUp('Gama')).toBeEnabled();
  });

  it('asks for the position above when moving up', async () => {
    mockReorder.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveUp('Gama'));

    // `position` é o índice de destino na listagem, zero-based
    await waitFor(() => expect(mockReorder).toHaveBeenCalledWith('c', 1));
  });

  it('asks for the position below when moving down', async () => {
    mockReorder.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveDown('Alpha'));

    await waitFor(() => expect(mockReorder).toHaveBeenCalledWith('a', 1));
  });

  it('shows the new sequence the API reports back', async () => {
    // a API devolve a listagem inteira reordenada, porque mover um projeto
    // desloca os outros
    mockReorder.mockResolvedValue({ ok: true, projects: [beta, alpha, gama] });

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveDown('Alpha'));

    await waitFor(() =>
      expect(renderedOrder()).toEqual(['Beta', 'Alpha', 'Gama']),
    );
  });

  /** A troca acontece na tela antes da resposta, senão o clique parece inerte. */
  it('keeps the optimistic order when the response carries no listing', async () => {
    mockReorder.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveUp('Gama'));

    await waitFor(() =>
      expect(renderedOrder()).toEqual(['Alpha', 'Gama', 'Beta']),
    );
  });

  it('puts the order back and explains itself when the call fails', async () => {
    mockReorder.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveDown('Alpha'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      admin.errors.actionFailed,
    );
    // uma ordem que a API não gravou não pode ficar na tela: a próxima
    // recarga a desfaria sem aviso
    expect(renderedOrder()).toEqual(['Alpha', 'Beta', 'Gama']);
  });

  it('sends an expired session to the login instead of showing an error', async () => {
    mockReorder.mockResolvedValue({ ok: false, reason: 'unauthenticated' });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(moveDown('Alpha'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
  });

  it('locks the controls while a move is in flight', async () => {
    mockReorder.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderTable([alpha, beta, gama]);

    await user.click(moveDown('Alpha'));

    // um segundo clique antes da resposta mandaria uma posição calculada
    // sobre uma ordem que o servidor ainda não confirmou
    await waitFor(() => expect(moveDown('Gama')).toBeDisabled());
    expect(
      screen.getByRole('button', { name: 'Excluir Alpha' }),
    ).toBeDisabled();
  });

  it('clears a previous failure once a move succeeds', async () => {
    mockReorder.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const user = userEvent.setup();
    renderTable([alpha, beta]);

    await user.click(moveDown('Alpha'));
    expect(await screen.findByRole('alert')).toBeVisible();

    mockReorder.mockResolvedValue({ ok: true, projects: [beta, alpha] });
    await user.click(moveDown('Alpha'));

    // um erro antigo ao lado de uma ação que deu certo faria a pessoa achar
    // que falhou de novo
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });
});

describe('a listagem do servidor sobrepõe a local', () => {
  const alpha = project({ id: 'a', title: { pt: 'Alpha' } });
  const beta = project({ id: 'b', title: { pt: 'Beta' } });
  const gama = project({ id: 'c', title: { pt: 'Gama' } });

  /**
   * Sem ressincronizar, o estado local ignoraria toda prop posterior à
   * primeira — e o `router.refresh()` disparado depois de cada ação buscaria
   * dados frescos que a tabela jogaria fora.
   */
  it('adopts a listing the server sends after the first render', () => {
    const { rerender } = renderTable([alpha, beta]);

    rerender(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <AdminProjectsTable
          projects={[gama, alpha, beta]}
          failed={false}
          newProjectPath="/admin/projects/novo"
          editPathPrefix="/admin/projects"
          loginPath="/admin/login"
        />
      </NextIntlClientProvider>,
    );

    expect(renderedOrder()).toEqual(['Gama', 'Alpha', 'Beta']);
  });

  /**
   * A comparação é por identidade, e é o que separa os dois casos: um render
   * pela mesma listagem não mexe no estado local, enquanto uma listagem nova
   * — que é o que o `router.refresh()` produz depois de uma escrita — passa a
   * valer. A tabela só descarta o que aplicou localmente quando o servidor
   * tem algo mais recente a dizer.
   */
  it('keeps a locally applied change when re-rendered with the same listing', async () => {
    mockDelete.mockResolvedValue({ ok: true });

    const listing = [alpha, beta];
    const user = userEvent.setup();
    const { rerender } = renderTable(listing);

    await user.click(screen.getByRole('button', { name: 'Excluir Alpha' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: admin.deleteConfirm,
      }),
    );
    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());

    rerender(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <AdminProjectsTable
          projects={listing}
          failed={false}
          newProjectPath="/admin/projects/novo"
          editPathPrefix="/admin/projects"
          loginPath="/admin/login"
        />
      </NextIntlClientProvider>,
    );

    // Ressuscitar a linha excluída num render que não trouxe dado novo faria
    // a exclusão parecer ter voltado atrás sozinha.
    expect(screen.queryByText('Alpha')).toBeNull();
  });
});
