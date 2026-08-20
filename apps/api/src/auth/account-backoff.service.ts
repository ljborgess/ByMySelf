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
  lastFailureAt: number;
}

/**
 * How long a key is kept after its last failure. Measured from the failure
 * rather than from blockedUntil so the window means "idle this long",
 * independent of how far the backoff had escalated. Comfortably past
 * MAX_DELAY_MS so eviction never cuts short a backoff still being served,
 * but short enough that escalation resets after a long quiet spell instead
 * of punishing someone for failures hours old.
 */
const ENTRY_TTL_MS = 60 * 60 * 1000;

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
    if (this.isExpired(entry, now)) {
      this.state.delete(key);
      return 0;
    }
    return Math.max(0, entry.blockedUntil - now);
  }

  recordFailure(key: string, now: number = Date.now()): void {
    // On login the key is the submitted email -- attacker-controlled and
    // unbounded in cardinality. Without this sweep every failed attempt
    // against a made-up address would leave an entry behind for good.
    this.evictExpired(now);

    const existing = this.state.get(key);
    const previousCount =
      existing && !this.isExpired(existing, now) ? existing.failureCount : 0;
    const failureCount = previousCount + 1;

    this.state.set(key, {
      failureCount,
      blockedUntil: now + backoffDelayMs(failureCount),
      lastFailureAt: now,
    });
  }

  recordSuccess(key: string): void {
    this.state.delete(key);
  }

  /** Entry count, for tests asserting that eviction actually happens. */
  get size(): number {
    return this.state.size;
  }

  private isExpired(entry: AccountState, now: number): boolean {
    return now - entry.lastFailureAt >= ENTRY_TTL_MS;
  }

  private evictExpired(now: number): void {
    for (const [key, entry] of this.state) {
      if (this.isExpired(entry, now)) {
        this.state.delete(key);
      }
    }
  }
}
