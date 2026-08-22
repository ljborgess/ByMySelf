import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import { login } from '../../lib/auth';
import { LoginForm } from './login-form';

jest.mock('../../lib/auth', () => ({ login: jest.fn() }));

const mockReplace = jest.fn();
jest.mock('../../i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockLogin = login as jest.MockedFunction<typeof login>;

function renderForm() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <LoginForm dashboardPath="/admin" />
    </NextIntlClientProvider>,
  );
}

async function submit(email = 'dono@exemplo.com', password = 'senha-correta') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(messages.adminLogin.email), email);
  await user.type(
    screen.getByLabelText(messages.adminLogin.password),
    password,
  );
  await user.click(
    screen.getByRole('button', { name: messages.adminLogin.submit }),
  );
  return user;
}

describe('LoginForm', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders labelled email and password fields', () => {
    renderForm();

    expect(screen.getByLabelText(messages.adminLogin.email)).toBeVisible();
    expect(screen.getByLabelText(messages.adminLogin.password)).toBeVisible();
  });

  it('sends exactly what was typed to the API client', async () => {
    mockLogin.mockResolvedValue({ ok: true });

    renderForm();
    await submit('dono@exemplo.com', 'senha-correta');

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith(
        'dono@exemplo.com',
        'senha-correta',
      ),
    );
  });

  it('redirects to the dashboard on success', async () => {
    mockLogin.mockResolvedValue({ ok: true });

    renderForm();
    await submit();

    // `replace`, não `push`: voltar depois de entrar não deve trazer a pessoa
    // de volta ao formulário
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/admin'));
  });

  it('shows a generic message on invalid credentials, naming neither field', async () => {
    mockLogin.mockResolvedValue({ ok: false, reason: 'invalid' });

    renderForm();
    await submit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(messages.adminLogin.errors.invalid);
    // a API não revela qual campo estava errado, e a UI não deve inventar
    // essa distinção
    expect(alert.textContent).not.toMatch(/e-mail não|senha não|não existe/i);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('distinguishes being rate limited from a wrong password', async () => {
    // chamar isso de "senha incorreta" convidaria a tentar de novo, que é
    // exatamente o que piora a situação de quem já bateu no limite
    mockLogin.mockResolvedValue({ ok: false, reason: 'rateLimited' });

    renderForm();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.adminLogin.errors.rateLimited,
    );
  });

  it('distinguishes the API being unreachable from a wrong password', async () => {
    mockLogin.mockResolvedValue({ ok: false, reason: 'unavailable' });

    renderForm();
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.adminLogin.errors.unavailable,
    );
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveLogin: (result: { ok: true }) => void = () => {};
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    renderForm();
    await submit();

    const button = screen.getByRole('button');
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent(messages.adminLogin.submitting);

    resolveLogin({ ok: true });
  });

  it('does not fire a second request when submitted twice quickly', async () => {
    // um clique duplo numa rede lenta gastaria duas tentativas do orçamento
    // de rate limit da própria pessoa
    mockLogin.mockReturnValue(new Promise(() => {}));

    renderForm();
    const user = await submit();
    await user.click(screen.getByRole('button'));

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('clears a previous error when a new attempt starts', async () => {
    mockLogin.mockResolvedValue({ ok: false, reason: 'invalid' });
    renderForm();
    await submit();
    expect(await screen.findByRole('alert')).toBeVisible();

    mockLogin.mockResolvedValue({ ok: true });
    await submit();

    // um erro antigo sobrando ao lado de um login que deu certo faria a
    // pessoa achar que falhou de novo
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });
});
