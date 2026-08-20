import {
  AccountBackoffService,
  backoffDelayMs,
} from './account-backoff.service';

describe('backoffDelayMs', () => {
  it('requires no delay before any failure', () => {
    expect(backoffDelayMs(0)).toBe(0);
  });

  it('doubles the delay with each consecutive failure: 1s, 2s, 4s, 8s, 16s', () => {
    expect(backoffDelayMs(1)).toBe(1000);
    expect(backoffDelayMs(2)).toBe(2000);
    expect(backoffDelayMs(3)).toBe(4000);
    expect(backoffDelayMs(4)).toBe(8000);
    expect(backoffDelayMs(5)).toBe(16_000);
  });

  it('caps at 30s instead of growing unbounded', () => {
    expect(backoffDelayMs(6)).toBe(30_000);
    expect(backoffDelayMs(20)).toBe(30_000);
  });
});

describe('AccountBackoffService', () => {
  let service: AccountBackoffService;

  beforeEach(() => {
    service = new AccountBackoffService();
  });

  it('allows the first attempt for a key that has never failed', () => {
    expect(service.getRetryAfterMs('admin@example.com')).toBe(0);
  });

  it('requires waiting the backoff delay after a failure, using a fake clock', () => {
    const start = 1_000_000;
    service.recordFailure('admin@example.com', start);

    // still within the 1s window after the first failure
    expect(service.getRetryAfterMs('admin@example.com', start + 500)).toBe(500);
    // window has fully elapsed
    expect(service.getRetryAfterMs('admin@example.com', start + 1000)).toBe(0);
  });

  it('grows the delay with each consecutive failure on the same key', () => {
    const t = 1_000_000;
    service.recordFailure('admin@example.com', t);
    expect(service.getRetryAfterMs('admin@example.com', t)).toBe(1000);

    service.recordFailure('admin@example.com', t + 1000);
    expect(service.getRetryAfterMs('admin@example.com', t + 1000)).toBe(2000);

    service.recordFailure('admin@example.com', t + 3000);
    expect(service.getRetryAfterMs('admin@example.com', t + 3000)).toBe(4000);
  });

  it('never produces a permanent lockout -- retry-after always reaches 0', () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      service.recordFailure('admin@example.com', t);
    }

    const delay = service.getRetryAfterMs('admin@example.com', t);
    expect(delay).toBeGreaterThan(0);
    expect(service.getRetryAfterMs('admin@example.com', t + delay)).toBe(0);
  });

  it('resets the counter on success, so the next failure starts back at the base delay', () => {
    const t = 1_000_000;
    service.recordFailure('admin@example.com', t);
    service.recordFailure('admin@example.com', t);
    service.recordSuccess('admin@example.com');

    expect(service.getRetryAfterMs('admin@example.com', t)).toBe(0);

    service.recordFailure('admin@example.com', t);
    expect(service.getRetryAfterMs('admin@example.com', t)).toBe(1000);
  });

  it('keeps independent state per key -- one account backing off does not affect another', () => {
    const t = 1_000_000;
    service.recordFailure('victim@example.com', t);
    service.recordFailure('victim@example.com', t);
    service.recordFailure('victim@example.com', t);

    expect(service.getRetryAfterMs('victim@example.com', t)).toBeGreaterThan(0);
    expect(service.getRetryAfterMs('someone-else@example.com', t)).toBe(0);
  });

  describe('eviction', () => {
    const HOUR_MS = 60 * 60 * 1000;

    it('does not grow without bound as failures arrive for new keys over time', () => {
      const t = 1_000_000;

      // login keys this map by the submitted email, so an attacker picks
      // the key -- without eviction these would accumulate for good
      for (let i = 0; i < 500; i += 1) {
        service.recordFailure(`attacker-${i}@example.com`, t);
      }
      expect(service.size).toBe(500);

      // one more failure an hour later sweeps every stale entry
      service.recordFailure('later@example.com', t + HOUR_MS + 1);

      expect(service.size).toBe(1);
    });

    it('never evicts an entry whose backoff is still being served', () => {
      const t = 1_000_000;
      for (let i = 0; i < 6; i += 1) {
        service.recordFailure('admin@example.com', t);
      }
      // capped at 30s, so still blocked moments later
      expect(service.getRetryAfterMs('admin@example.com', t + 1000)).toBe(
        29_000,
      );

      service.recordFailure('unrelated@example.com', t + 1000);

      expect(service.getRetryAfterMs('admin@example.com', t + 1000)).toBe(
        29_000,
      );
    });

    it('treats a long-idle key as fresh, restarting escalation at the base delay', () => {
      const t = 1_000_000;
      service.recordFailure('admin@example.com', t);
      service.recordFailure('admin@example.com', t);
      service.recordFailure('admin@example.com', t);

      const muchLater = t + HOUR_MS + 1;
      expect(service.getRetryAfterMs('admin@example.com', muchLater)).toBe(0);

      service.recordFailure('admin@example.com', muchLater);
      expect(service.getRetryAfterMs('admin@example.com', muchLater)).toBe(
        1000,
      );
    });
  });
});
