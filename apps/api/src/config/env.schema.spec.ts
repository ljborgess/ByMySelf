import { envSchema } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  TRUST_PROXY_HOPS: '0',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/portfolio',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '30d',
  COOKIE_DOMAIN: 'localhost',
  FRONTEND_URL: 'http://localhost:3001',
  SENTRY_DSN: '',
};

describe('envSchema', () => {
  it('parses a complete valid environment into a typed config object', () => {
    const result = envSchema.parse(validEnv);

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
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
    expect(result.PORT).toBe(3000);
  });
});
