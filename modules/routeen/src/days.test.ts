import { barStart } from './practices';
import { dayState, daySky, indexMarks, isKeptInWeek, litDays, steadiest, weekSky, weekSummary, weekTarget, yearSky, isScheduledOn, marksInWeek } from './days';
import { markId, type Mark, type Practice, type Tier } from './practices';
import type { ModeOf } from './modes';

const today = '2026-11-25'; // Wednesday; the week starts 2026-11-23
const run: Practice = { id: 'run', name: 'Run', why: '', cadence: { kind: 'daily' }, startedOn: '2026-01-01', pausedOn: null };
const mum: Practice = { ...run, id: 'mum', cadence: { kind: 'weekly', weekday: 5 } };
const read: Practice = { ...run, id: 'read', cadence: { kind: 'times', n: 3 } };
const mark = (r: string, date: string, tier?: Tier): Mark => ({ id: markId(r, date), ritualId: r, date, ...(tier ? { tier } : {}) });
const normal: ModeOf = () => 'normal';

it('reads each day of a practice', () => {
  const idx = indexMarks([mark('run', '2026-11-23', 'minimum'), mark('run', '2026-11-22')]);
  expect(dayState(run, '2026-11-23', idx, normal, today)).toBe('lit-minimum');
  expect(dayState(run, '2026-11-22', idx, normal, today)).toBe('lit-target');
  expect(dayState(run, '2026-11-24', idx, normal, today)).toBe('unlit');
  expect(dayState(run, today, idx, normal, today)).toBe('open');
  expect(dayState(run, '2026-11-26', idx, normal, today)).toBe('future');
  expect(dayState(mum, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState(read, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState({ ...run, pausedOn: '2026-11-24' }, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState(run, '2026-11-24', idx, (d) => (d === '2026-11-24' ? 'off' : 'normal'), today)).toBe('rest');
});
it('knows what is scheduled on a day', () => {
  expect(isScheduledOn(run, '2026-11-24')).toBe(true);
  expect(isScheduledOn(mum, '2026-11-28')).toBe(true);
  expect(isScheduledOn(mum, '2026-11-24')).toBe(false);
  expect(isScheduledOn(read, '2026-11-24')).toBe(false);
  expect(isScheduledOn({ ...run, pausedOn: '2026-11-24' }, '2026-11-24')).toBe(false);
});
it('counts a mark at any tier as kept, and subtracts Day-off days from n a week', () => {
  const idx = indexMarks([mark('read', '2026-11-16', 'minimum'), mark('read', '2026-11-17')]);
  const lastWeek = '2026-11-16';
  expect(marksInWeek(read, lastWeek, idx)).toBe(2);
  expect(isKeptInWeek(read, lastWeek, idx, today, normal)).toBe(false); // 2 of 3
  const oneOff: ModeOf = (d) => (d === '2026-11-20' ? 'off' : 'normal');
  expect(weekTarget(read, lastWeek, today, oneOff)).toBe(2);
  expect(isKeptInWeek(read, lastWeek, idx, today, oneOff)).toBe(true);
});
it('is fair to the week still running', () => {
  const idx = indexMarks([mark('run', '2026-11-23'), mark('run', '2026-11-24')]);
  const start = '2026-11-23';
  expect(weekTarget(run, start, today, normal)).toBe(3);
  expect(weekTarget(run, start, today, (d) => (d === '2026-11-24' ? 'off' : 'normal'))).toBe(2);
  expect(weekTarget(mum, start, today, normal)).toBe(0);
  expect(weekTarget(mum, start, '2026-11-28', normal)).toBe(1);
  expect(weekTarget(read, start, today, normal)).toBe(0);
  expect(isKeptInWeek(read, start, idx, today, normal)).toBe(false);
  expect(isKeptInWeek(read, start, indexMarks([mark('read', '2026-11-24')]), today, normal)).toBe(true);
  expect(isKeptInWeek(run, start, idx, today, normal)).toBe(false);
  expect(isKeptInWeek({ ...run, startedOn: '2026-12-01' }, start, idx, today, normal)).toBe(false);
  // only practices the week has asked something of (or that have a mark) are counted
  expect(weekSummary([run, mum, read], idx, start, today, normal)).toEqual({ kept: 0, active: 1 });
  expect(weekSummary([run, mum, read], indexMarks([...idx.values(), mark('read', '2026-11-24')]), start, today, normal)).toEqual({ kept: 1, active: 2 });
});
it('summarises a day of the sky by its brightest tier and its mode', () => {
  const idx = indexMarks([mark('run', '2026-11-23', 'minimum'), mark('read', '2026-11-23', 'more')]);
  expect(daySky([run, read], idx, '2026-11-23', today, normal)).toEqual({ date: '2026-11-23', light: 'more', mode: 'normal', expected: true, future: false });
  expect(daySky([run], idx, '2026-11-26', today, normal).future).toBe(true);
  expect(weekSky([run], idx, '2026-11-23', today, normal)).toHaveLength(7);
  const year = yearSky([run], idx, today, normal);
  expect(year).toHaveLength(52);
  expect(year.every((w) => w.length === 7)).toBe(true);
  expect(year[51]![0]!.date).toBe('2026-11-23');
  expect(barStart(year[0]![0]!.date)).toBe(year[0]![0]!.date);
});
it('counts lit days, not marks, and finds the steadiest practice by kept weeks', () => {
  const marks = [mark('run', '2026-11-23'), mark('read', '2026-11-23'), mark('run', '2026-11-24')];
  expect(litDays(marks, '2026')).toBe(2);
  expect(litDays(marks, '2025')).toBe(0);
  expect(steadiest([run], indexMarks([]), today, normal)).toBeNull();
  const weekly = { ...run, id: 'w', cadence: { kind: 'times', n: 1 } as const, startedOn: '2026-10-01' };
  const m = [mark('w', '2026-11-03'), mark('w', '2026-11-10'), mark('w', '2026-11-17')];
  expect(steadiest([weekly], indexMarks(m), today, normal)).toEqual({ practice: weekly, weeks: 3 });
});
