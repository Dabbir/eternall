import { barDays, barStart, cadenceLabel, isActiveOn, markId, tierOf, timeOf, validatePractice, weekdayOf } from './practices';

import { copy } from './copy';

const today = '2026-11-25'; // a Wednesday

describe('practices', () => {
  it('starts bars on Monday', () => {
    expect(weekdayOf('2026-11-23')).toBe(0);
    expect(weekdayOf(today)).toBe(2);
    expect(barStart(today)).toBe('2026-11-23');
    expect(barDays('2026-11-23')).toHaveLength(7);
    expect(barDays('2026-11-23')[6]).toBe('2026-11-29');
  });

  it('keys a mark by practice and day', () => {
    expect(markId('run', today)).toBe('run_2026-11-25');
  });

  it('knows when a practice is active', () => {
    const p = { startedOn: '2026-11-10', pausedOn: '2026-11-20' };
    expect(isActiveOn(p, '2026-11-09')).toBe(false);
    expect(isActiveOn(p, '2026-11-10')).toBe(true);
    expect(isActiveOn(p, '2026-11-20')).toBe(false);
    expect(isActiveOn({ ...p, pausedOn: null }, '2027-01-01')).toBe(true);
  });

  it('validates a new practice in plain words', () => {
    const base = { name: 'Read 20 pages', why: '', cadence: { kind: 'daily' as const }, startedOn: today, timeOfDay: 'anytime' as const, measure: null };
    expect(validatePractice(base, today).ok).toBe(true);
    const bad = validatePractice({ ...base, name: ' ', cadence: { kind: 'times', n: 9 } }, today);
    expect(bad.ok ? {} : bad.errors).toEqual({ name: 'A practice needs a few words.', cadence: 'Choose between 1 and 6 times a week.' });
    expect(cadenceLabel({ kind: 'weekly', weekday: 5 })).toBe('Saturdays');
  });

  it('reads a mark without a tier as Target, so the loom era keeps every day', () => {
    expect(tierOf({})).toBe('target');
    expect(tierOf({ tier: 'minimum' })).toBe('minimum');
  });
  it('treats a practice without a time of day as any time', () => {
    expect(timeOf({})).toBe('anytime');
  });
  it('validates an optional measure', () => {
    const base = { name: 'Run', why: '', cadence: { kind: 'daily' } as const, startedOn: today, timeOfDay: 'morning' as const };
    expect(validatePractice({ ...base, measure: { unit: 'menit', target: 30, minimum: 10 } }, today).ok).toBe(true);
    expect(validatePractice({ ...base, measure: { unit: 'menit', target: 10, minimum: 30 } }, today)).toMatchObject({ ok: false, errors: { measure: expect.any(String) } });
    expect(validatePractice({ ...base, measure: { unit: 'x'.repeat(21), target: 30, minimum: 10 } }, today).ok).toBe(false);
    expect(validatePractice({ ...base, measure: { unit: 'menit', target: 0, minimum: 0 } }, today).ok).toBe(false);
    const ok = validatePractice({ ...base, measure: null }, today);
    expect(ok.ok && 'measure' in ok.value).toBe(false);
  });
  it('names a blank unit apart from a long one, and rejects non-finite numbers', () => {
    const base = { name: 'Run', why: '', cadence: { kind: 'daily' } as const, startedOn: today, timeOfDay: 'morning' as const };
    const err = (measure: { unit: string; target: number; minimum: number }) => {
      const v = validatePractice({ ...base, measure }, today);
      return v.ok ? undefined : v.errors.measure;
    };
    expect(err({ unit: '', target: 30, minimum: 10 })).toBe(copy.errors.unitBlank);
    expect(err({ unit: '   ', target: 30, minimum: 10 })).toBe(copy.errors.unitBlank);
    expect(err({ unit: 'x'.repeat(21), target: 30, minimum: 10 })).toBe(copy.errors.unitLong(20));
    expect(err({ unit: 'menit', target: NaN, minimum: 10 })).toBe(copy.errors.measureRange);
    expect(err({ unit: 'menit', target: 30, minimum: Infinity })).toBe(copy.errors.measureRange);
  });
  it('says cadences from the catalogue', () => {
    expect(cadenceLabel({ kind: 'daily' })).toBe(copy.cadenceLine.daily);
    expect(cadenceLabel({ kind: 'times', n: 1 })).toBe(copy.cadenceLine.once);
    expect(cadenceLabel({ kind: 'times', n: 3 })).toBe('3 times a week');
  });
  it('never writes the old thread fields', () => {
    const v = validatePractice({ name: 'Run', why: '', cadence: { kind: 'daily' }, startedOn: today, timeOfDay: 'anytime', measure: null }, today);
    expect(v.ok && Object.keys(v.value)).not.toContain('thread');
  });
});
