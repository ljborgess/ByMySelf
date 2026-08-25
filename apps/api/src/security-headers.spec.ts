import type { Request, Response } from 'express';
import { securityHeaders } from './security-headers';

const FRONTEND_URL = 'https://portfolio.exemplo.com';

/**
 * Runs the middleware against a stubbed response and collects what it set, so
 * the assertions are about headers on the wire rather than about how Helmet
 * was configured.
 */
function headersFor(nodeEnv: string): Record<string, string> {
  const middleware = securityHeaders(nodeEnv, FRONTEND_URL);
  const headers: Record<string, string> = {};

  const response = {
    setHeader: (name: string, value: string | string[]) => {
      headers[name.toLowerCase()] = Array.isArray(value)
        ? value.join(', ')
        : String(value);
    },
    removeHeader: (name: string) => {
      delete headers[name.toLowerCase()];
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
  } as unknown as Response;

  middleware({ secure: true } as Request, response, () => {});

  return headers;
}

describe('securityHeaders', () => {
  /**
   * O header vale para o host inteiro e ignora a porta, então mandá-lo de
   * http://localhost:3100 faz o browser forçar https:// em *toda* porta de
   * localhost — inclusive o site de dev na 3101, que não serve TLS. O sintoma
   * é um fetch que falha antes de sair do browser, aparecendo como "verifique
   * sua conexão" num login que está perfeito.
   */
  it('does not send HSTS outside production, where there is no TLS to protect', () => {
    expect(headersFor('development')).not.toHaveProperty(
      'strict-transport-security',
    );
  });

  it('does not send HSTS in the test environment either', () => {
    expect(headersFor('test')).not.toHaveProperty('strict-transport-security');
  });

  /** RNF-SEG6: em produção a API está atrás de TLS e o header faz o trabalho. */
  it('sends HSTS in production', () => {
    expect(headersFor('production')['strict-transport-security']).toContain(
      'max-age=',
    );
  });

  describe('o resto do Helmet vale em todo ambiente', () => {
    it.each(['development', 'test', 'production'])(
      'sets the CSP, X-Content-Type-Options and frame policy in %s',
      (nodeEnv) => {
        const headers = headersFor(nodeEnv);

        expect(headers['content-security-policy']).toBeDefined();
        expect(headers['x-content-type-options']).toBe('nosniff');
      },
    );

    /**
     * A API não é para ser embutida em lugar nenhum, e `frame-ancestors` é o
     * que o browser moderno respeita — o X-Frame-Options fica como resquício
     * para quem não respeita.
     */
    it('refuses to be framed', () => {
      expect(headersFor('production')['content-security-policy']).toContain(
        "frame-ancestors 'none'",
      );
    });

    /**
     * A única origem que esta API deveria alcançar é o próprio front. Um
     * curinga aqui esvaziaria a política.
     */
    it('scopes connect-src to the frontend, with no wildcard', () => {
      const csp = headersFor('production')['content-security-policy'];

      expect(csp).toContain(`connect-src 'self' ${FRONTEND_URL}`);
      expect(csp).not.toContain('*');
    });
  });
});
