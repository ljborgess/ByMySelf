import { envSchema, envSchemaWithCrossChecks } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3100',
  TRUST_PROXY_HOPS: '0',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5434/portfolio',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '30d',
  COOKIE_DOMAIN: 'localhost',
  FRONTEND_URL: 'http://localhost:3101',
  SENTRY_DSN: '',
};

describe('envSchema', () => {
  it('parses a complete valid environment into a typed config object', () => {
    const result = envSchema.parse(validEnv);

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3100,
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_ACCESS_SECRET: validEnv.JWT_ACCESS_SECRET,
    });
  });

  it('rejects a JWT secret too short to resist offline brute force', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow();
  });

  it('throws when a required variable is missing', () => {
    const { DATABASE_URL, ...withoutDatabaseUrl } = validEnv;
    void DATABASE_URL;

    expect(() => envSchema.parse(withoutDatabaseUrl)).toThrow();
  });

  it('throws when PORT is not numeric', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, PORT: 'not-a-number' }),
    ).toThrow();
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, DATABASE_URL: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects a JWT expiration that is not a valid duration string', () => {
    expect(() =>
      envSchema.parse({
        ...validEnv,
        JWT_ACCESS_EXPIRATION: 'fifteen minutes',
      }),
    ).toThrow();
  });

  // RNF-SEG4: access 15 minutes, refresh 7-30 days. A value that merely
  // parses is not enough -- "15d" for the access token is a plausible typo
  // that would silently hand out fortnight-long credentials.
  it('rejects an access token lifetime longer than 15 minutes', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, JWT_ACCESS_EXPIRATION: '15d' }),
    ).toThrow();
    expect(() =>
      envSchema.parse({ ...validEnv, JWT_ACCESS_EXPIRATION: '1h' }),
    ).toThrow();
  });

  it('rejects a refresh token lifetime outside the 7-30 day range', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, JWT_REFRESH_EXPIRATION: '1d' }),
    ).toThrow();
    expect(() =>
      envSchema.parse({ ...validEnv, JWT_REFRESH_EXPIRATION: '365d' }),
    ).toThrow();
  });

  it('accepts lifetimes inside the documented bounds', () => {
    const result = envSchema.parse({
      ...validEnv,
      JWT_ACCESS_EXPIRATION: '5m',
      JWT_REFRESH_EXPIRATION: '7d',
    });

    expect(result.JWT_ACCESS_EXPIRATION).toBe('5m');
    expect(result.JWT_REFRESH_EXPIRATION).toBe('7d');
  });

  it('defaults TRUST_PROXY_HOPS to 0 so nothing is trusted without opting in', () => {
    const { TRUST_PROXY_HOPS, ...withoutTrustProxy } = validEnv;
    void TRUST_PROXY_HOPS;

    expect(envSchema.parse(withoutTrustProxy).TRUST_PROXY_HOPS).toBe(0);
  });

  it('coerces TRUST_PROXY_HOPS from its string env value and rejects nonsense', () => {
    expect(
      envSchema.parse({ ...validEnv, TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS,
    ).toBe(1);
    // `true` is the classic footgun: it would trust a client-supplied
    // X-Forwarded-For and let anyone forge their way past the rate limit
    expect(() =>
      envSchema.parse({ ...validEnv, TRUST_PROXY_HOPS: 'true' }),
    ).toThrow();
    expect(() =>
      envSchema.parse({ ...validEnv, TRUST_PROXY_HOPS: '-1' }),
    ).toThrow();
  });

  it('defaults NODE_ENV and PORT when omitted', () => {
    const { NODE_ENV, PORT, ...withoutDefaults } = validEnv;
    void NODE_ENV;
    void PORT;

    const result = envSchema.parse(withoutDefaults);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3100);
  });
});

/**
 * Fechamento da Fase 1 (#39). Estas regras existem porque cada uma delas, se
 * violada, produz uma falha *silenciosa* em produção: o app sobe, responde
 * 200, e a coisa que deveria proteger não protege.
 */
describe('envSchemaWithCrossChecks', () => {
  const prodEnv = {
    ...validEnv,
    NODE_ENV: 'production',
    COOKIE_DOMAIN: 'bymyself.com.br',
    FRONTEND_URL: 'https://bymyself.com.br',
    JWT_ACCESS_SECRET: 'A'.repeat(48),
    JWT_REFRESH_SECRET: 'B'.repeat(48),
  };

  function parse(patch: Record<string, unknown> = {}) {
    return envSchemaWithCrossChecks.safeParse({ ...prodEnv, ...patch });
  }

  it('accepts a well-formed production configuration', () => {
    expect(parse().success).toBe(true);
  });

  it('still accepts the local development shape', () => {
    expect(envSchemaWithCrossChecks.safeParse(validEnv).success).toBe(true);
  });

  describe('JWT secrets (user story 2)', () => {
    it('rejects identical access and refresh secrets', () => {
      // Cada um passa no min(32) sozinho, então só a checagem cruzada pega.
      // Iguais, um access token capturado serve para forjar um refresh e a
      // separação entre os dois vira decorativa.
      const result = parse({ JWT_REFRESH_SECRET: 'A'.repeat(48) });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/must differ from/i);
    });

    it('rejects a leftover placeholder secret in production', () => {
      const result = parse({ JWT_ACCESS_SECRET: `changeme-${'x'.repeat(40)}` });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/placeholder|development value/i);
    });
  });

  describe('CORS origin (user story 3)', () => {
    it('rejects a trailing slash', () => {
      // O header Origin do browser nunca traz barra final, e o CORS compara
      // literalmente — com a barra, TODO request cross-origin é rejeitado, e
      // o sintoma é "o login não funciona".
      const result = parse({ FRONTEND_URL: 'https://bymyself.com.br/' });

      expect(result.success).toBe(false);
      // a mensagem mostra a forma correta, que é o que a pessoa precisa
      expect(JSON.stringify(result)).toMatch(/exactly the origin/i);
      expect(JSON.stringify(result)).toContain('https://bymyself.com.br');
    });

    it('rejects a path', () => {
      expect(
        parse({ FRONTEND_URL: 'https://bymyself.com.br/app' }).success,
      ).toBe(false);
    });

    /**
     * Cada um destes é uma URL perfeitamente válida que **não** é igual ao
     * header `Origin` do browser — e a comparação do CORS é literal. Uma
     * checagem só de caminho deixaria todos passarem, e o resultado seria
     * todo request cross-origin rejeitado em produção.
     */
    it.each([
      ['porta default explícita', 'https://bymyself.com.br:443'],
      ['query string', 'https://bymyself.com.br?a=1'],
      ['fragmento', 'https://bymyself.com.br#x'],
      ['userinfo', 'https://user@bymyself.com.br'],
    ])('rejects %s', (_label, url) => {
      expect(parse({ FRONTEND_URL: url }).success).toBe(false);
    });

    it('accepts a non-default port, which the Origin header does carry', () => {
      expect(
        parse({ FRONTEND_URL: 'https://bymyself.com.br:8443' }).success,
      ).toBe(true);
    });

    it('rejects http in production, since the auth cookie is Secure', () => {
      const result = parse({ FRONTEND_URL: 'http://bymyself.com.br' });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/https in production/i);
    });

    it('rejects an uppercased scheme, but says why in a way that shows the fix', () => {
      // O browser manda o esquema sempre em minúsculas no header `Origin`,
      // então `HTTPS://` de fato quebraria o CORS — rejeitar é o correto.
      // O que não pode é rejeitar com "use https", que contradiria o que a
      // pessoa digitou; a mensagem de origem mostra a forma certa.
      const result = parse({ FRONTEND_URL: 'HTTPS://bymyself.com.br' });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/exactly the origin/i);
      expect(JSON.stringify(result)).not.toMatch(/must use https/i);
    });
  });

  describe('cookie domain (user story 4)', () => {
    it('rejects a scheme, which browsers silently drop the cookie for', () => {
      const result = parse({ COOKIE_DOMAIN: 'https://bymyself.com.br' });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/scheme/i);
    });

    it('rejects a port', () => {
      expect(parse({ COOKIE_DOMAIN: 'bymyself.com.br:443' }).success).toBe(
        false,
      );
    });

    // Mesmo engano, outra grafia — a checagem não pode ser um `=== 'localhost'`
    it.each(['localhost', 'LOCALHOST', '127.0.0.1'])(
      'rejects the local development value %s in production',
      (domain) => {
        expect(parse({ COOKIE_DOMAIN: domain }).success).toBe(false);
      },
    );
  });
});
