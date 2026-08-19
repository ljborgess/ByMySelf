import { envSchema } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/portfolio',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
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
      JWT_ACCESS_SECRET: 'access-secret',
    });
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

  it('defaults NODE_ENV and PORT when omitted', () => {
    const { NODE_ENV, PORT, ...withoutDefaults } = validEnv;
    void NODE_ENV;
    void PORT;

    const result = envSchema.parse(withoutDefaults);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
  });
});
