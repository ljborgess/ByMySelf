/**
 * Moves `targetId` to `position` within `orderedIds`, returning the full new
 * sequence. Pure: the caller persists the result.
 *
 * Full reindex on every move rather than gap-based ordering (1000, 2000,
 * ...) or fractional keys. A personal portfolio holds a handful of projects,
 * so rewriting every row costs nothing, and in exchange the `order` column
 * stays a contiguous 0..n-1 sequence that can be read at a glance and can
 * never drift into needing a rebalance.
 *
 * `position` is clamped rather than rejected: anything past the end means
 * "last", which is how a UI naturally expresses that without having to know
 * the current count.
 */
export function computeReordering(
  orderedIds: string[],
  targetId: string,
  position: number,
): string[] {
  const currentIndex = orderedIds.indexOf(targetId);
  if (currentIndex === -1) {
    throw new Error(`${targetId} is not part of the ordering`);
  }

  const withoutTarget = orderedIds.filter((id) => id !== targetId);
  const clamped = Math.min(Math.max(position, 0), withoutTarget.length);

  return [
    ...withoutTarget.slice(0, clamped),
    targetId,
    ...withoutTarget.slice(clamped),
  ];
}
