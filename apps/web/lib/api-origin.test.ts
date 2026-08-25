import { apiOrigin, assertApiUrlConfigured } from './api-origin';

describe('apiOrigin', () => {
  it('keeps only the origin, since connect-src ignores the path', () => {
    expect(apiOrigin('https://api.exemplo.com/v1/algo?x=1')).toBe(
      'https://api.exemplo.com',
    );
  });

  it('keeps the port, which is what separates the two dev origins', () => {
    expect(apiOrigin('http://localhost:3100')).toBe('http://localhost:3100');
  });

  it('reports nothing when the variable is absent', () => {
    expect(apiOrigin(undefined)).toBeUndefined();
    expect(apiOrigin('')).toBeUndefined();
  });

  /**
   * Um erro de digitação falha exatamente como a variável faltando — a CSP
   * fica sem a origem —, então os dois casos têm que sair iguais daqui para
   * o guard pegar ambos.
   */
  it('reports nothing for a malformed URL instead of throwing', () => {
    expect(apiOrigin('nao-e-uma-url')).toBeUndefined();
    expect(apiOrigin('http://')).toBeUndefined();
  });
});

describe('assertApiUrlConfigured', () => {
  describe('desenvolvimento', () => {
    /**
     * O modo de falha que este guard existe para acabar: sem a origem da API
     * a CSP sai com `connect-src 'self'`, o browser bloqueia toda chamada
     * antes de ela virar requisição, e o login responde "não foi possível
     * entrar" para qualquer credencial — sem nada no log do servidor.
     */
    it('refuses to boot when the variable is missing', () => {
      expect(() => assertApiUrlConfigured(undefined, 'development')).toThrow(
        /NEXT_PUBLIC_API_URL não está definida/,
      );
    });

    it('refuses to boot on a malformed URL, naming the value', () => {
      expect(() => assertApiUrlConfigured('htp:/typo', 'development')).toThrow(
        /não é uma URL válida: "htp:\/typo"/,
      );
    });

    /** Um erro que não diz o que fazer só troca um mistério por outro. */
    it('says how to fix it', () => {
      expect(() => assertApiUrlConfigured(undefined, 'development')).toThrow(
        /cp \.env\.example \.env/,
      );
      expect(() => assertApiUrlConfigured(undefined, 'development')).toThrow(
        /NEXT_PUBLIC_API_URL=http:\/\/localhost:3100/,
      );
    });

    it('stays quiet when the variable is usable', () => {
      expect(() =>
        assertApiUrlConfigured('http://localhost:3100', 'development'),
      ).not.toThrow();
    });
  });

  /**
   * Produção já é coberta pelo Dockerfile, que recusa o build sem a
   * variável — e a diferença importa: lá ela é inlinada no bundle do cliente
   * e não dá para corrigir depois.
   *
   * O `next build` do CI roda sem ela de propósito: é checagem de
   * compilação, e o artefato nunca chega a um browser. Falhar ali quebraria
   * o pipeline sem proteger ninguém.
   */
  it.each(['production', 'test', undefined])(
    'leaves NODE_ENV=%s alone, where other guards already apply',
    (nodeEnv) => {
      expect(() => assertApiUrlConfigured(undefined, nodeEnv)).not.toThrow();
    },
  );
});
