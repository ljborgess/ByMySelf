import type { Certificate } from '../content/profile';

/**
 * Most recently issued first.
 *
 * Undated entries keep their original order and sit after the dated ones: a
 * missing date means unknown, not old, and reordering them arbitrarily would
 * discard the only ordering information there is -- the order they were
 * written in.
 */
export function sortCertificates(entries: Certificate[]): Certificate[] {
  const dated = entries.filter((entry) => entry.issuedAt);
  const undated = entries.filter((entry) => !entry.issuedAt);

  // ISO-like strings compare correctly as text, so no Date parsing and no
  // timezone to get wrong
  dated.sort((a, b) => b.issuedAt!.localeCompare(a.issuedAt!));

  return [...dated, ...undated];
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * "março de 2026" from `2026-03`, or just "2026" when only a year is given.
 *
 * Formatted from the string rather than through `new Date()`: parsing
 * `2026-03` as a date lands on UTC midnight, which in a negative-offset
 * timezone renders as February -- a certificate silently dated a month early.
 *
 * Returns null when there is no date, so the caller omits it instead of
 * rendering an empty separator.
 */
export function formatIssuedAt(issuedAt: string | null): string | null {
  if (!issuedAt) {
    return null;
  }

  const [year, month] = issuedAt.split('-');
  if (!month) {
    return year;
  }

  const name = MONTHS[Number(month) - 1];
  return name ? `${name} de ${year}` : year;
}
