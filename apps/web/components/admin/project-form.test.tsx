import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import { makeAdminProject } from '../../lib/admin-project.fixture';
import { createProject, updateProject } from '../../lib/admin-projects-client';
import type { AdminProject } from '../../lib/admin-projects';
import { ProjectForm } from './project-form';

jest.mock('../../lib/admin-projects-client', () => ({
  createProject: jest.fn(),
  updateProject: jest.fn(),
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
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockCreate = createProject as jest.MockedFunction<typeof createProject>;
const mockUpdate = updateProject as jest.MockedFunction<typeof updateProject>;

const form = messages.adminProjectForm;

function renderForm(project?: AdminProject) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <ProjectForm
        project={project}
        dashboardPath="/admin/projects"
        loginPath="/admin/login"
      />
    </NextIntlClientProvider>,
  );
}

/** Preenche o mínimo que o schema compartilhado exige de uma criação. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Slug/), 'meu-projeto');
  await user.type(screen.getByLabelText(/^Título \*/), 'Meu projeto');
  await user.type(screen.getByLabelText(/^Descrição \*/), 'Uma descrição.');
  await user.type(screen.getByLabelText(/^Conteúdo \*/), '# Conteúdo');
}

function submitButton(name: string) {
  return screen.getByRole('button', { name });
}

describe('ProjectForm — criação', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders a labelled control for every Project field', () => {
    renderForm();

    expect(screen.getByLabelText(/^Slug/)).toBeVisible();
    expect(screen.getByLabelText(/^Título \*/)).toBeVisible();
    expect(screen.getByLabelText(/^Título \(inglês\)/)).toBeVisible();
    expect(screen.getByLabelText(/^Descrição \*/)).toBeVisible();
    expect(screen.getByLabelText(/^Descrição \(inglês\)/)).toBeVisible();
    expect(screen.getByLabelText(/^Conteúdo \*/)).toBeVisible();
    expect(screen.getByLabelText(/^Conteúdo \(inglês\)/)).toBeVisible();
    expect(screen.getByLabelText(/^Tecnologia/)).toBeVisible();
    expect(screen.getByLabelText(/^Repositório/)).toBeVisible();
    expect(screen.getByLabelText(/^Demonstração/)).toBeVisible();
    expect(screen.getByLabelText(/^Imagem de capa/)).toBeVisible();
    expect(screen.getByLabelText(/^Status/)).toBeVisible();
    expect(screen.getByLabelText(form.fields.featured)).toBeVisible();
    expect(screen.getByLabelText(/^Concluído em/)).toBeVisible();
  });

  /** RF-PROJ1: EN é opcional, e a tela precisa dizer isso sem ambiguidade. */
  it('marks the en fields as optional and the pt fields as required', () => {
    renderForm();

    expect(
      screen.getByLabelText(/^Título \(inglês\) \(opcional\)/),
    ).toBeVisible();
    expect(screen.getByLabelText(/^Título \*/)).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getByLabelText(/^Título \(inglês\)/)).not.toHaveAttribute(
      'aria-required',
    );
  });

  /**
   * User story 3: o erro fica ao lado do campo, e não como blob no topo — e a
   * chamada não sai, porque o payload é o mesmo que a API recusaria.
   */
  it('shows the inline error on the missing pt field and does not call the API', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Slug/), 'meu-projeto');
    await user.click(submitButton(form.submit.create));

    // Um erro por campo faltando, e não uma mensagem só no topo: são três
    // campos pt vazios, então são três mensagens.
    expect(await screen.findAllByText(form.errors.requiredPt)).toHaveLength(3);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ties each inline error to its own field for a screen reader', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(submitButton(form.submit.create));

    const title = await screen.findByLabelText(/^Título \*/);
    await waitFor(() => expect(title).toHaveAttribute('aria-invalid', 'true'));

    const describedBy = title.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(
      document.getElementById(describedBy!.split(' ')[0]),
    ).toHaveTextContent(form.errors.requiredPt);
  });

  it('reports a badly formatted slug on the slug field, not as a generic failure', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Slug/), 'Meu Projeto!');
    await user.type(screen.getByLabelText(/^Título \*/), 'Meu projeto');
    await user.type(screen.getByLabelText(/^Descrição \*/), 'Uma descrição.');
    await user.type(screen.getByLabelText(/^Conteúdo \*/), '# Conteúdo');
    await user.click(submitButton(form.submit.create));

    expect(await screen.findByText(form.errors.invalidSlug)).toBeVisible();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('sends the API client exactly the payload the fields describe', async () => {
    mockCreate.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS');
    await user.click(submitButton(form.addTech));
    await user.type(
      screen.getByLabelText(/^Repositório/),
      'https://github.com/exemplo/api',
    );
    await user.click(screen.getByLabelText(form.fields.featured));
    await user.click(submitButton(form.submit.create));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        title: { pt: 'Meu projeto' },
        description: { pt: 'Uma descrição.' },
        content: { pt: '# Conteúdo' },
        slug: 'meu-projeto',
        techStack: ['NestJS'],
        repoUrl: 'https://github.com/exemplo/api',
        status: 'in_progress',
        featured: true,
      }),
    );
  });

  it('redirects to the dashboard on success', async () => {
    mockCreate.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));

    // `replace`, não `push`: voltar depois de salvar não deve trazer a pessoa
    // a um formulário com dados já gravados
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/projects'),
    );
    // a listagem é Server Component: sem o refresh, o cache de rota do cliente
    // poderia mostrar a tabela sem o que acabou de ser salvo
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('does not fire a second request when submitted twice quickly', async () => {
    mockCreate.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));
    await user.click(submitButton(form.submitting));

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('sends someone with an expired session to the login instead of showing an error', async () => {
    mockCreate.mockResolvedValue({ ok: false, reason: 'unauthenticated' });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
  });

  /**
   * A API diz qual projeto está segurando o slug e onde ele está; um texto
   * fixo não diria, e é justamente essa informação que resolve o problema.
   */
  it('surfaces the API message on a slug conflict rather than failing silently', async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      reason: 'conflict',
      message: 'O slug "meu-projeto" já está em uso.',
    });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O slug "meu-projeto" já está em uso.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('puts a server-side field rejection next to the field it names', async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      reason: 'invalid',
      fieldErrors: { slug: 'Esse slug não serve.' },
    });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));

    expect(await screen.findByText('Esse slug não serve.')).toBeVisible();
  });

  it('distinguishes the API being unreachable from a rejected payload', async () => {
    mockCreate.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      form.errors.unavailable,
    );
  });

  it('lets the form be used again after a failure', async () => {
    mockCreate.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(submitButton(form.submit.create));
    expect(await screen.findByRole('alert')).toBeVisible();

    mockCreate.mockResolvedValue({ ok: true });
    await user.click(submitButton(form.submit.create));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    // um erro antigo sobrando ao lado de um salvamento que deu certo faria a
    // pessoa achar que falhou de novo
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });
});

describe('ProjectForm — tecnologias', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('adds a technology as a removable entry', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS');
    await user.click(submitButton(form.addTech));

    const list = screen.getByRole('list');
    expect(within(list).getByText('NestJS')).toBeVisible();
    // o campo esvazia, senão a próxima adição começa com o texto anterior
    expect(screen.getByLabelText(/^Tecnologia/)).toHaveValue('');
  });

  it('adds on Enter without submitting the whole form', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS{Enter}');

    expect(within(screen.getByRole('list')).getByText('NestJS')).toBeVisible();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('removes the technology its button names', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS{Enter}');
    await user.type(screen.getByLabelText(/^Tecnologia/), 'Next.js{Enter}');
    await user.click(screen.getByRole('button', { name: 'Remover NestJS' }));

    const list = screen.getByRole('list');
    expect(within(list).queryByText('NestJS')).not.toBeInTheDocument();
    expect(within(list).getByText('Next.js')).toBeVisible();
  });

  it('ignores a duplicate instead of listing the same technology twice', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS{Enter}');
    await user.type(screen.getByLabelText(/^Tecnologia/), 'NestJS{Enter}');

    expect(screen.getAllByText('NestJS')).toHaveLength(1);
  });

  it('ignores an empty entry', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Tecnologia/), '   {Enter}');

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('ProjectForm — tradução pendente', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  /** User story 4: de relance, e dizendo *quais* campos faltam. */
  it('names the fields still missing an English translation', () => {
    renderForm(
      makeAdminProject({
        title: { pt: 'Projeto', en: 'Project' },
        description: { pt: 'Descrição.' },
        content: { pt: 'Conteúdo.' },
      }),
    );

    expect(
      screen.getByText('Tradução em inglês pendente: Descrição, Conteúdo.'),
    ).toBeVisible();
  });

  it('drops the indicator once every field is translated', () => {
    renderForm(
      makeAdminProject({
        title: { pt: 'Projeto', en: 'Project' },
        description: { pt: 'Descrição.', en: 'Description.' },
        content: { pt: 'Conteúdo.', en: 'Content.' },
      }),
    );

    expect(screen.queryByText(/Tradução em inglês pendente/)).toBeNull();
  });

  it('updates as the missing translation is typed in', async () => {
    const user = userEvent.setup();
    renderForm(
      makeAdminProject({
        title: { pt: 'Projeto', en: 'Project' },
        description: { pt: 'Descrição.', en: 'Description.' },
        content: { pt: 'Conteúdo.' },
      }),
    );

    expect(
      screen.getByText('Tradução em inglês pendente: Conteúdo.'),
    ).toBeVisible();

    await user.type(screen.getByLabelText(/^Conteúdo \(inglês\)/), 'Content.');

    expect(screen.queryByText(/Tradução em inglês pendente/)).toBeNull();
  });
});

describe('ProjectForm — edição', () => {
  const existing = makeAdminProject({
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'api-de-pedidos',
    title: { pt: 'API de pedidos', en: 'Orders API' },
    description: { pt: 'Curta.', en: 'Short.' },
    content: { pt: '# Detalhe', en: '# Detail' },
    techStack: ['NestJS', 'PostgreSQL'],
    repoUrl: 'https://github.com/exemplo/api',
    demoUrl: 'https://exemplo.com',
    coverImageUrl: 'https://exemplo.com/capa.png',
    status: 'completed',
    featured: true,
    completedAt: '2026-03-01',
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /** RF-PROJ2: abrir a edição não pode custar redigitar o que já existe. */
  it('pre-fills every field from the project being edited', () => {
    renderForm(existing);

    expect(screen.getByLabelText(/^Slug/)).toHaveValue('api-de-pedidos');
    expect(screen.getByLabelText(/^Título \*/)).toHaveValue('API de pedidos');
    expect(screen.getByLabelText(/^Título \(inglês\)/)).toHaveValue(
      'Orders API',
    );
    expect(screen.getByLabelText(/^Descrição \*/)).toHaveValue('Curta.');
    expect(screen.getByLabelText(/^Conteúdo \*/)).toHaveValue('# Detalhe');
    expect(screen.getByLabelText(/^Repositório/)).toHaveValue(
      'https://github.com/exemplo/api',
    );
    expect(screen.getByLabelText(/^Demonstração/)).toHaveValue(
      'https://exemplo.com',
    );
    expect(screen.getByLabelText(/^Imagem de capa/)).toHaveValue(
      'https://exemplo.com/capa.png',
    );
    expect(screen.getByLabelText(/^Status/)).toHaveValue('completed');
    expect(screen.getByLabelText(form.fields.featured)).toBeChecked();
    expect(screen.getByLabelText(/^Concluído em/)).toHaveValue('2026-03-01');

    const list = screen.getByRole('list');
    expect(within(list).getByText('NestJS')).toBeVisible();
    expect(within(list).getByText('PostgreSQL')).toBeVisible();
  });

  it('offers the edit wording rather than the create wording', () => {
    renderForm(existing);

    expect(submitButton(form.submit.edit)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: form.submit.create }),
    ).not.toBeInTheDocument();
  });

  it('patches the project it was given, with the whole edited state', async () => {
    mockUpdate.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm(existing);

    await user.clear(screen.getByLabelText(/^Título \*/));
    await user.type(screen.getByLabelText(/^Título \*/), 'API de vendas');
    await user.click(submitButton(form.submit.edit));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        expect.objectContaining({
          title: { pt: 'API de vendas', en: 'Orders API' },
          slug: 'api-de-pedidos',
        }),
      ),
    );
  });

  /**
   * Chave ausente num PATCH significa "não mexe": sem o `null` explícito o
   * link antigo continuaria no banco, e a tela mostraria uma remoção que não
   * aconteceu.
   */
  it('clears a link that was emptied, instead of leaving the old value', async () => {
    mockUpdate.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm(existing);

    await user.clear(screen.getByLabelText(/^Demonstração/));
    await user.click(submitButton(form.submit.edit));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ demoUrl: null }),
      ),
    );
  });

  /**
   * Omitir a chave `en` é o que significa "não traduzido"; o schema recusa
   * string vazia justamente para o site público não ter que adivinhar.
   */
  it('drops a removed English translation instead of storing an empty string', async () => {
    mockUpdate.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm(existing);

    await user.clear(screen.getByLabelText(/^Título \(inglês\)/));
    await user.click(submitButton(form.submit.edit));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload.title).toEqual({ pt: 'API de pedidos' });
  });

  it('refuses a completion date on a project moved back to in progress', async () => {
    const user = userEvent.setup();
    renderForm(existing);

    await user.selectOptions(screen.getByLabelText(/^Status/), 'in_progress');
    await user.click(submitButton(form.submit.edit));

    expect(
      await screen.findByText(form.errors.completedAtNeedsCompleted),
    ).toBeVisible();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
