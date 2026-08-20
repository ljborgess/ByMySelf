import type { Education } from '../content/profile';

/**
 * Most recent first, with ongoing entries ahead of finished ones -- what
 * someone is doing now is the more relevant fact.
 *
 * Entries without a startDate sort last among their group rather than being
 * treated as ancient: a missing date means unknown, not old.
 */
export function sortEducation(entries: Education[]): Education[] {
  return [...entries].sort((a, b) => {
    const aOngoing = a.endDate === null;
    const bOngoing = b.endDate === null;
    if (aOngoing !== bOngoing) {
      return aOngoing ? -1 : 1;
    }

    if (!a.startDate) {
      return b.startDate ? 1 : 0;
    }
    if (!b.startDate) {
      return -1;
    }

    // ISO-like strings ('2023-02', '2023-02-01') compare correctly as text,
    // so no Date parsing and no timezone to get wrong
    return b.startDate.localeCompare(a.startDate);
  });
}

function year(date: string): string {
  return date.slice(0, 4);
}

/**
 * Years only. A course spanning "2023 – 2026" says everything a visitor
 * needs; the month adds noise to a scannable list.
 *
 * Returns null when there is no startDate, so the caller omits the period
 * rather than rendering a dangling separator.
 */
export function formatPeriod(
  entry: Pick<Education, 'startDate' | 'endDate'>,
  ongoingLabel: string,
): string | null {
  if (!entry.startDate) {
    return null;
  }

  const start = year(entry.startDate);
  if (!entry.endDate) {
    return `${start} – ${ongoingLabel}`;
  }

  const end = year(entry.endDate);
  // a course that began and ended in the same year reads oddly as "2024 – 2024"
  return start === end ? start : `${start} – ${end}`;
}
