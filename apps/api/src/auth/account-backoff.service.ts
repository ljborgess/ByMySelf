import { Injectable } from '@nestjs/common';

const BASE_DELAY_MS = 1000;

// RNF-SEG5: delay grows with each consecutive failure but never past this
// ceiling, and there is no failure count that ever refuses an attempt
// outright -- an attacker deliberately failing login a few times must not
// be able to lock the site owner out of their own single account.
const MAX_DELAY_MS = 30_000;

/**
 * failureCount -> required delay before the next attempt for that key is
 * accepted. 1s, 2s, 4s, 8s, 16s, then capped at 30s.
 */
export function backoffDelayMs(failureCount: number): number {
  if (failureCount <= 0) {
    return 0;
  }
  return Math.min(BASE_DELAY_MS * 2 ** (failureCount - 1), MAX_DELAY_MS);
}

interface AccountState {
  failureCount: number;
  blockedUntil: number;
}

/**
 * Per-account (not per-IP -- that's ThrottlerGuard) progressive backoff,
 * keyed by whatever identifies the account for the caller: the submitted
 * email for login, the resolved userId for refresh. In-memory is enough for
 * this single-instance VPS deploy (out of scope: a shared store for a
 * multi-instance deployment this project does not have).
 */
@Injectable()
export class AccountBackoffService {
  private readonly state = new Map<string, AccountState>();

  /** Milliseconds `key` must still wait, 0 if its next attempt is accepted now. */
  getRetryAfterMs(key: string, now: number = Date.now()): number {
    const entry = this.state.get(key);
    if (!entry) {
      return 0;
    }
    return Math.max(0, entry.blockedUntil - now);
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const failureCount = (this.state.get(key)?.failureCount ?? 0) + 1;
    this.state.set(key, {
      failureCount,
      blockedUntil: now + backoffDelayMs(failureCount),
    });
  }

  recordSuccess(key: string): void {
    this.state.delete(key);
  }
}
