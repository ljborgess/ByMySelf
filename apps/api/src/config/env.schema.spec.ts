import { envSchema } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3100',
  TRUST_PROXY_HOPS: '0',
  FRONTEND_URL: 'http://localhost:3101',
  GITHUB_TOKEN: 'github_pat_x',
  GITHUB_USERNAME: 'ljborgess',
};

describe('envSchema', () => {
  it('parses a complete valid environment into a typed config object', () => {
    const result = envSchema.parse(validEnv);

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3100,
      GITHUB_TOKEN: validEnv.GITHUB_TOKEN,
      GITHUB_USERNAME: validEnv.GITHUB_USERNAME,
    });
  });

  it('throws when GITHUB_TOKEN is missing', () => {
    const { GITHUB_TOKEN, ...withoutToken } = validEnv;
    void GITHUB_TOKEN;

    expect(() => envSchema.parse(withoutToken)).toThrow();
  });

  it('throws when GITHUB_USERNAME is missing', () => {
    const { GITHUB_USERNAME, ...withoutUsername } = validEnv;
    void GITHUB_USERNAME;

    expect(() => envSchema.parse(withoutUsername)).toThrow();
  });

  it('throws when a required variable is missing', () => {
    const { FRONTEND_URL, ...withoutFrontendUrl } = validEnv;
    void FRONTEND_URL;

    expect(() => envSchema.parse(withoutFrontendUrl)).toThrow();
  });

  it('throws when PORT is not numeric', () => {
    expect(() =>
      envSchema.parse({ ...validEnv, PORT: 'not-a-number' }),
    ).toThrow();
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

  describe('CORS origin (RNF-SEG7)', () => {
    it('rejects a trailing slash', () => {
      // O header Origin do browser nunca traz barra final, e o CORS compara
      // literalmente.
      const result = envSchema.safeParse({
        ...validEnv,
        FRONTEND_URL: 'https://bymyself.com.br/',
      });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(/exactly the origin/i);
    });

    it('rejects a path', () => {
      expect(
        envSchema.safeParse({
          ...validEnv,
          FRONTEND_URL: 'https://bymyself.com.br/app',
        }).success,
      ).toBe(false);
    });

    it('accepts a non-default port, which the Origin header does carry', () => {
      expect(
        envSchema.safeParse({
          ...validEnv,
          FRONTEND_URL: 'https://bymyself.com.br:8443',
        }).success,
      ).toBe(true);
    });
  });
});
