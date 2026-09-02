import type { Education } from '../content/profile';
import { formatPeriod, sortEducation } from './education';

function entry(overrides: Partial<Education> = {}): Education {
  return {
    course: 'Curso',
    institution: 'Instituição',
    startDate: '2020-01',
    endDate: '2023-12',
    ...overrides,
  };
}

describe('sortEducation', () => {
  it('puts an ongoing entry ahead of a finished one', () => {
    const finished = entry({ course: 'Concluído', endDate: '2023-12' });
    const ongoing = entry({ course: 'Em curso', endDate: null });

    expect(
      sortEducation([finished, ongoing]).map((item) => item.course),
    ).toEqual(['Em curso', 'Concluído']);
  });

  it('orders finished entries most recent first', () => {
    const older = entry({ course: 'Antigo', startDate: '2015-01' });
    const newer = entry({ course: 'Recente', startDate: '2020-01' });

    expect(sortEducation([older, newer]).map((item) => item.course)).toEqual([
      'Recente',
      'Antigo',
    ]);
  });

  it('orders ongoing entries among themselves by start date', () => {
    const a = entry({ course: 'A', startDate: '2022-01', endDate: null });
    const b = entry({ course: 'B', startDate: '2024-01', endDate: null });

    expect(sortEducation([a, b]).map((item) => item.course)).toEqual([
      'B',
      'A',
    ]);
  });

  it('sorts an entry with no start date last in its group, not first', () => {
    // a missing date means unknown, not ancient
    const dated = entry({ course: 'Com data', startDate: '2015-01' });
    const undated = entry({ course: 'Sem data', startDate: null });

    expect(sortEducation([undated, dated]).map((item) => item.course)).toEqual([
      'Com data',
      'Sem data',
    ]);
  });

  it('does not mutate the array it was given', () => {
    const input = [
      entry({ course: 'Primeiro', startDate: '2015-01' }),
      entry({ course: 'Segundo', startDate: '2020-01' }),
    ];

    sortEducation(input);

    expect(input.map((item) => item.course)).toEqual(['Primeiro', 'Segundo']);
  });

  it('handles an empty list', () => {
    expect(sortEducation([])).toEqual([]);
  });
});

describe('formatPeriod', () => {
  it('shows years only, start to end', () => {
    expect(
      formatPeriod(
        { startDate: '2020-02', endDate: '2023-12' },
        'Em andamento',
      ),
    ).toBe('2020 – 2023');
  });

  it('marks an ongoing entry with the given label', () => {
    expect(
      formatPeriod({ startDate: '2023-02', endDate: null }, 'Em andamento'),
    ).toBe('2023 – Em andamento');
  });

  it('collapses a single-year course to one year', () => {
    // "2024 – 2024" reads oddly
    expect(
      formatPeriod(
        { startDate: '2024-01', endDate: '2024-11' },
        'Em andamento',
      ),
    ).toBe('2024');
  });

  it('returns null with no start date, so the caller omits the period', () => {
    // otherwise it would render a dangling separator
    expect(
      formatPeriod({ startDate: null, endDate: null }, 'Em andamento'),
    ).toBeNull();
    expect(
      formatPeriod({ startDate: null, endDate: '2023-12' }, 'Em andamento'),
    ).toBeNull();
  });

  it('accepts a full ISO date as well as YYYY-MM', () => {
    expect(
      formatPeriod(
        { startDate: '2020-02-15', endDate: '2023-12-20' },
        'Em andamento',
      ),
    ).toBe('2020 – 2023');
  });
});
