import { corsOptions } from './cors-options';

const FRONTEND_URL = 'https://portfolio.exemplo.com';

/** Resolve a função de origem como o middleware de CORS resolveria. */
function allows(nodeEnv: string, origin: string | undefined): boolean {
  const { origin: rule } = corsOptions(nodeEnv, FRONTEND_URL);

  if (typeof rule === 'string') {
    return rule === origin;
  }
  if (typeof rule !== 'function') {
    throw new Error('unexpected origin rule');
  }

  let allowed = false;
  rule(origin, (_error, result) => {
    allowed = result === true;
  });
  return allowed;
}

describe('corsOptions', () => {
  describe('produção', () => {
    it('allows the frontend and nothing else', () => {
      expect(allows('production', FRONTEND_URL)).toBe(true);
      expect(allows('production', 'https://outro.exemplo.com')).toBe(false);
    });

    /**
     * A brecha que este teste fecha: loopback liberado em produção deixaria
     * qualquer página que um atacante rodasse na máquina da vítima falar com
     * a API como se fosse o site de produção.
     */
    it.each(['http://localhost:3101', 'http://127.0.0.1:3101'])(
      'refuses %s, which is a development value',
      (origin) => {
        expect(allows('production', origin)).toBe(false);
      },
    );
  });

  describe('desenvolvimento', () => {
    /**
     * `localhost` e `127.0.0.1` são o mesmo computador com duas grafias, e o
     * browser as trata como origens distintas. Com uma só liberada, abrir o
     * site pela outra faz o fetch ser bloqueado antes de sair — e a tela
     * reporta isso como "verifique sua conexão" num login correto.
     */
    it.each([
      'http://localhost:3101',
      'http://127.0.0.1:3101',
      'http://localhost:4000',
      'http://[::1]:3101',
    ])('allows the loopback origin %s', (origin) => {
      expect(allows('development', origin)).toBe(true);
    });

    it('still allows the configured frontend', () => {
      expect(allows('development', FRONTEND_URL)).toBe(true);
    });

    /** Sem `Origin` não é requisição de browser — curl, um health check. */
    it('allows a request that carries no Origin at all', () => {
      expect(allows('development', undefined)).toBe(true);
    });

    it('refuses an origin that is neither loopback nor the frontend', () => {
      expect(allows('development', 'http://evil.exemplo.com')).toBe(false);
    });

    /**
     * Loopback é a máquina de quem desenvolve; um host da rede não é, e
     * liberá-lo exporia a API a qualquer um no mesmo wifi.
     */
    it('refuses a LAN address, which is not loopback', () => {
      expect(allows('development', 'http://192.168.10.152:3101')).toBe(false);
    });

    /**
     * Um domínio que apenas *contém* "localhost" não é loopback. A checagem é
     * sobre o hostname, não sobre a string.
     */
    it.each([
      'http://localhost.evil.com',
      'http://notlocalhost',
      'http://127.0.0.1.evil.com',
    ])('refuses %s, which only looks like loopback', (origin) => {
      expect(allows('development', origin)).toBe(false);
    });

    it('refuses a malformed origin instead of throwing', () => {
      expect(allows('development', 'nao-e-uma-url')).toBe(false);
    });

    /**
     * https em loopback significa outra coisa — um proxy TLS na frente — e
     * não é o cenário que esta abertura existe para servir.
     */
    it('refuses https on loopback', () => {
      expect(allows('development', 'https://localhost:3101')).toBe(false);
    });
  });
});
