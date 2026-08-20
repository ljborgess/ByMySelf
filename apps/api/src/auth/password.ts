import * as argon2 from 'argon2';

/**
 * RNF-SEG1: Argon2id, matching what AuthService.login verifies against.
 * argon2.verify() reads its parameters back out of the hash string itself,
 * so there is nothing to keep in sync beyond both call sites agreeing on
 * the algorithm -- this is that single source.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
