import * as argon2 from 'argon2';
import prompts from 'prompts';
import { runCreateAdmin } from './create-admin';
import { upsertAdmin } from './upsert-admin';

jest.mock('prompts');
jest.mock('./upsert-admin');
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn().mockReturnValue({}),
}));

const mockedPrompts = jest.mocked(prompts);
const mockedUpsertAdmin = jest.mocked(upsertAdmin);

describe('runCreateAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockedUpsertAdmin.mockResolvedValue('created');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** The question objects the command handed to `prompts`. */
  function askedQuestions(): { name: string; type: string | null }[] {
    return mockedPrompts.mock.calls[0][0] as unknown as {
      name: string;
      type: string | null;
    }[];
  }

  it('prompts for both email and password when no --email flag is given', async () => {
    mockedPrompts.mockResolvedValue({
      email: 'admin@example.com',
      password: 'secret',
    });

    await runCreateAdmin([]);

    const questions = askedQuestions();
    expect(questions.find((q) => q.name === 'email')?.type).toBe('text');
    expect(mockedUpsertAdmin).toHaveBeenCalledWith(
      expect.anything(),
      'admin@example.com',
      expect.any(String),
    );
  });

  it('skips the email prompt and uses the flag value when --email is given', async () => {
    mockedPrompts.mockResolvedValue({ password: 'secret' });

    await runCreateAdmin(['--email=flag@example.com']);

    // a null type is how `prompts` is told to skip a question
    const questions = askedQuestions();
    expect(questions.find((q) => q.name === 'email')?.type).toBeNull();
    expect(mockedUpsertAdmin).toHaveBeenCalledWith(
      expect.anything(),
      'flag@example.com',
      expect.any(String),
    );
  });

  it('always asks for the password as a masked prompt, never as a flag', async () => {
    mockedPrompts.mockResolvedValue({ password: 'secret' });

    await runCreateAdmin(['--email=flag@example.com', '--password=leaked']);

    const questions = askedQuestions();
    expect(questions.find((q) => q.name === 'password')?.type).toBe('password');
    // a --password flag is simply not read: the value that reaches the
    // database is the prompted one, so nothing lands in shell history
    const [, , passwordHash] = mockedUpsertAdmin.mock.calls[0];
    await expect(argon2.verify(passwordHash, 'secret')).resolves.toBe(true);
    await expect(argon2.verify(passwordHash, 'leaked')).resolves.toBe(false);
  });

  it('stores an Argon2id hash, never the plaintext password', async () => {
    mockedPrompts.mockResolvedValue({
      email: 'admin@example.com',
      password: 'correct-horse-battery-staple',
    });

    await runCreateAdmin([]);

    const [, , passwordHash] = mockedUpsertAdmin.mock.calls[0];
    expect(passwordHash).not.toBe('correct-horse-battery-staple');
    expect(passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('closes the connection pool even when the upsert fails', async () => {
    const { Pool } = jest.requireMock<typeof import('pg')>('pg');
    mockedPrompts.mockResolvedValue({
      email: 'admin@example.com',
      password: 'secret',
    });
    mockedUpsertAdmin.mockRejectedValue(new Error('connection refused'));

    await expect(runCreateAdmin([])).rejects.toThrow('connection refused');

    const poolInstance = jest.mocked(Pool).mock.results[0].value as {
      end: jest.Mock;
    };
    expect(poolInstance.end).toHaveBeenCalledTimes(1);
  });
});
