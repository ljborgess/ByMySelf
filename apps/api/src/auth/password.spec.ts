import * as argon2 from 'argon2';
import { hashPassword } from './password';

describe('hashPassword', () => {
  it('returns an Argon2id hash, never the plaintext password itself', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('produces a hash that verifies against the original password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    await expect(
      argon2.verify(hash, 'correct-horse-battery-staple'),
    ).resolves.toBe(true);
    await expect(argon2.verify(hash, 'wrong-password')).resolves.toBe(false);
  });
});
