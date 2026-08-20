import { computeReordering } from './reorder';

describe('computeReordering', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];

  /** Every assertion below checks the whole sequence, not just the moved id. */
  it('moves a project to the front', () => {
    expect(computeReordering(ids, 'd', 0)).toEqual(['d', 'a', 'b', 'c', 'e']);
  });

  it('moves a project to the back', () => {
    expect(computeReordering(ids, 'b', 4)).toEqual(['a', 'c', 'd', 'e', 'b']);
  });

  it('moves a project forward into a middle position', () => {
    expect(computeReordering(ids, 'b', 2)).toEqual(['a', 'c', 'b', 'd', 'e']);
  });

  it('moves a project backward into a middle position', () => {
    expect(computeReordering(ids, 'e', 1)).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  it('leaves the sequence untouched when the position is already current', () => {
    expect(computeReordering(ids, 'c', 2)).toEqual(ids);
  });

  it('clamps a position past the end to last, the natural "move to end"', () => {
    expect(computeReordering(ids, 'a', 999)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('handles a single-project listing', () => {
    expect(computeReordering(['only'], 'only', 0)).toEqual(['only']);
    expect(computeReordering(['only'], 'only', 5)).toEqual(['only']);
  });

  it('rejects an id that is not part of the ordering', () => {
    expect(() => computeReordering(ids, 'missing', 0)).toThrow(
      /not part of the ordering/,
    );
  });

  describe('invariants, for every possible move', () => {
    // the property that actually matters: whatever the move, the result is a
    // permutation of the input, so reindexing it 0..n-1 can never produce a
    // duplicate or a gap
    it.each(ids)('keeps %s-moves a permutation of the input', (targetId) => {
      for (let position = 0; position <= ids.length + 1; position += 1) {
        const result = computeReordering(ids, targetId, position);

        expect(result).toHaveLength(ids.length);
        expect(new Set(result).size).toBe(ids.length);
        expect([...result].sort()).toEqual([...ids].sort());
      }
    });

    it('places the target exactly at the requested index', () => {
      for (let position = 0; position < ids.length; position += 1) {
        expect(computeReordering(ids, 'c', position).indexOf('c')).toBe(
          position,
        );
      }
    });

    it('preserves the relative order of everything it did not move', () => {
      const result = computeReordering(ids, 'c', 4);

      expect(result.filter((id) => id !== 'c')).toEqual(['a', 'b', 'd', 'e']);
    });
  });
});
