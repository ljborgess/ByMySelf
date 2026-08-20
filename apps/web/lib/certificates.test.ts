import type { Certificate } from '../content/profile';
import { formatIssuedAt, sortCertificates } from './certificates';

function cert(overrides: Partial<Certificate> = {}): Certificate {
  return {
    name: 'Certificado',
    issuer: 'Emissor',
    issuedAt: '2025-01',
    credentialUrl: null,
    ...overrides,
  };
}

describe('sortCertificates', () => {
  it('puts the most recently issued first', () => {
    const older = cert({ name: 'Antigo', issuedAt: '2023-05' });
    const newer = cert({ name: 'Recente', issuedAt: '2026-02' });

    expect(sortCertificates([older, newer]).map((entry) => entry.name)).toEqual(
      ['Recente', 'Antigo'],
    );
  });

  it('places undated entries after dated ones', () => {
    // a missing date means unknown, not old
    const dated = cert({ name: 'Com data', issuedAt: '2020-01' });
    const undated = cert({ name: 'Sem data', issuedAt: null });

    expect(
      sortCertificates([undated, dated]).map((entry) => entry.name),
    ).toEqual(['Com data', 'Sem data']);
  });

  it('keeps undated entries in the order they were written', () => {
    // that order is the only ordering information there is -- currently all
    // six certificates are undated, so reshuffling them would lose it
    const entries = [
      cert({ name: 'Primeiro', issuedAt: null }),
      cert({ name: 'Segundo', issuedAt: null }),
      cert({ name: 'Terceiro', issuedAt: null }),
    ];

    expect(sortCertificates(entries).map((entry) => entry.name)).toEqual([
      'Primeiro',
      'Segundo',
      'Terceiro',
    ]);
  });

  it('does not mutate the array it was given', () => {
    const entries = [
      cert({ name: 'Antigo', issuedAt: '2020-01' }),
      cert({ name: 'Recente', issuedAt: '2026-01' }),
    ];

    sortCertificates(entries);

    expect(entries.map((entry) => entry.name)).toEqual(['Antigo', 'Recente']);
  });

  it('handles an empty list', () => {
    expect(sortCertificates([])).toEqual([]);
  });
});

describe('formatIssuedAt', () => {
  it('spells out the month in Portuguese', () => {
    expect(formatIssuedAt('2026-03')).toBe('março de 2026');
  });

  it('handles every month, including the boundaries', () => {
    expect(formatIssuedAt('2026-01')).toBe('janeiro de 2026');
    expect(formatIssuedAt('2026-12')).toBe('dezembro de 2026');
  });

  it('shows just the year when no month is given', () => {
    expect(formatIssuedAt('2026')).toBe('2026');
  });

  it('accepts a full ISO date', () => {
    expect(formatIssuedAt('2026-03-15')).toBe('março de 2026');
  });

  it('does not shift the month across a timezone', () => {
    // parsing '2026-03' with new Date() lands on UTC midnight, which renders
    // as February in any negative-offset timezone -- silently dating the
    // certificate a month early
    expect(formatIssuedAt('2026-03')).toContain('março');
    expect(formatIssuedAt('2026-01')).toContain('janeiro');
  });

  it('falls back to the year rather than breaking on a nonsense month', () => {
    expect(formatIssuedAt('2026-13')).toBe('2026');
    expect(formatIssuedAt('2026-00')).toBe('2026');
  });

  it('returns null with no date, so the caller omits it', () => {
    expect(formatIssuedAt(null)).toBeNull();
  });
});
