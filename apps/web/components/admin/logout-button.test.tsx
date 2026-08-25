import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import { logout } from '../../lib/auth';
import { LogoutButton } from './logout-button';

jest.mock('../../lib/auth', () => ({ logout: jest.fn() }));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock('../../i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

const mockLogout = logout as jest.MockedFunction<typeof logout>;
const session = messages.adminSession;

function renderButton() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <LogoutButton loginPath="/admin/login" />
    </NextIntlClientProvider>,
  );
}

describe('LogoutButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('offers a way out of the session', () => {
    renderButton();

    expect(screen.getByRole('button', { name: session.logout })).toBeVisible();
  });

  /**
   * A rota existia desde a épica de autenticação sem nada na tela que a
   * chamasse — a única forma de encerrar era esperar o refresh token vencer,
   * trinta dias depois.
   */
  it('revokes the session on the API', async () => {
    mockLogout.mockResolvedValue(true);

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('leaves the panel for the login screen', async () => {
    mockLogout.mockResolvedValue(true);

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));

    // `replace`, não `push`: voltar depois de sair não pode trazer a pessoa
    // de volta ao painel
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
  });

  /**
   * Sem isto o cache de rota do cliente guardaria as telas do painel já
   * renderizadas, e voltar mostraria dados de uma sessão encerrada.
   */
  it('drops the client route cache on the way out', async () => {
    mockLogout.mockResolvedValue(true);

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  /**
   * O cookie pode ter sobrevivido, mas continuar num painel de uma sessão que
   * a pessoa mandou encerrar é pior que sair — e o caminho para tentar de
   * novo é justamente entrar e sair outra vez.
   */
  it('leaves even when the revocation failed', async () => {
    mockLogout.mockResolvedValue(false);

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
  });

  it('says it is leaving while the call is in flight', async () => {
    mockLogout.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));

    const button = await screen.findByRole('button', {
      name: session.leaving,
    });
    expect(button).toBeDisabled();
  });

  it('does not fire a second logout when clicked twice quickly', async () => {
    mockLogout.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: session.logout }));
    await user.click(screen.getByRole('button', { name: session.leaving }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
