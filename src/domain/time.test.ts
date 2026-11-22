import { addYears, birthdayAt, coordOf, horizonEnd, locate, parseISO, toISO, weekIndex, weekRange } from './time';

describe('calendar arithmetic', () => {
  it('parses and formats ISO dates round-trip', () => {
    expect(toISO(parseISO('2024-02-29'))).toBe('2024-02-29');
  });

  it('rejects impossible dates', () => {
    expect(parseISO('2023-02-29')).toBeNaN();
    expect(parseISO('2023-13-01')).toBeNaN();
    expect(parseISO('not a date')).toBeNaN();
  });

  it('clamps leap-day birthdays to Feb 28 in common years', () => {
    expect(toISO(birthdayAt('2000-02-29', 1))).toBe('2001-02-28');
    expect(toISO(birthdayAt('2000-02-29', 4))).toBe('2004-02-29');
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
  });
});

describe('lifeline weeks', () => {
  const birth = '1990-06-15';

  it('places the birth date in week 0 of year 0', () => {
    expect(locate(birth, birth)).toEqual({ age: 0, week: 0 });
  });

  it('returns null before birth', () => {
    expect(locate(birth, '1990-06-14')).toBeNull();
  });

  it('starts a new row exactly on each birthday', () => {
    expect(locate(birth, '2020-06-14')).toEqual({ age: 29, week: 51 });
    expect(locate(birth, '2020-06-15')).toEqual({ age: 30, week: 0 });
  });

  it('absorbs leftover days into the last week of the year', () => {
    const r = weekRange(birth, { age: 0, week: 51 });
    expect(r.start).toBe('1991-06-07');
    expect(r.end).toBe('1991-06-14');
    expect(locate(birth, '1991-06-14')).toEqual({ age: 0, week: 51 });
  });

  it('round-trips week ranges through locate', () => {
    for (const idx of [0, 1, 51, 52, 777, 1999, 4679]) {
      const c = coordOf(idx);
      const { start, end } = weekRange(birth, c);
      expect(weekIndex(locate(birth, start)!)).toBe(idx);
      expect(weekIndex(locate(birth, end)!)).toBe(idx);
    }
  });

  it('computes the final day of the horizon', () => {
    expect(horizonEnd(birth, 90)).toBe('2080-06-14');
  });
});
