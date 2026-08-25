import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/pt.json';
import { refreshSession } from '../../lib/auth';
import { SessionRecovery } from './session-recovery';

jest.mock('../../lib/auth', () => ({ refreshSession: jest.fn() }));

const mockRefresh = jest.fn();
const mockReplace = jest.fn();
jest.mock('../../i18n/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace }),
}));

const mockRefreshSession = refreshSession as jest.MockedFunction<
  typeof refreshSession
>;

function renderRecovery() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <SessionRecovery loginPath="/admin/login" />
    </NextIntlClientProvider>,
  );
}

describe('SessionRecovery', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('says what it is doing while the renewal is in flight', () => {
    mockRefreshSession.mockReturnValue(new Promise(() => {}));

    renderRecovery();

    expect(screen.getByText(messages.adminSession.restoring)).toBeVisible();
  });

  /**
   * A tela troca sozinha quando a renovação termina. Sem `aria-live`, quem
   * usa leitor de tela ouviria silêncio durante a espera e depois se veria
   * noutra página sem explicação.
   */
  it('announces itself to a screen reader', () => {
    mockRefreshSession.mockReturnValue(new Promise(() => {}));

    renderRecovery();

    const status = screen.getByText(messages.adminSession.restoring);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * O ponto inteiro do componente: renovar sem passar pelo login. Antes
   * disto, este estado mandava a pessoa reautenticar a cada quinze minutos
   * com uma sessão válida por trinta dias.
   */
  it('re-renders the page instead of asking for a new login', async () => {
    mockRefreshSession.mockResolvedValue({ ok: true });

    renderRecovery();

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes to the login when there is no session left to renew', async () => {
    mockRefreshSession.mockResolvedValue({ ok: false, reason: 'expired' });

    renderRecovery();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  /**
   * Ficar nesta tela repetindo seria pior: uma página que só diz
   * "restaurando" para sempre não dá saída nenhuma, enquanto o login é uma
   * tela que a pessoa sabe usar.
   */
  it('goes to the login when the API is unreachable, rather than hanging', async () => {
    mockRefreshSession.mockResolvedValue({ ok: false, reason: 'unavailable' });

    renderRecovery();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/admin/login'),
    );
  });

  it('renews once, not once per mount pass', async () => {
    mockRefreshSession.mockResolvedValue({ ok: true });

    renderRecovery();

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });
});
