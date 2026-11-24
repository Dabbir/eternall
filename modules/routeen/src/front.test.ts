import { allAsPlanned, frontPage, groupByTime, fullWeekTarget, isDueOn, tapTier, type FrontInput } from './front';
import { indexMarks } from './days';
import { markId, type Mark, type Practice, type Tier } from './practices';
import type { ModeOf } from './modes';

const run: Practice = { id: 'run', name: 'Run', why: '', cadence: { kind: 'daily' }, startedOn: '2026-01-01', pausedOn: null };
const mum: Practice = { ...run, id: 'mum', cadence: { kind: 'weekly', weekday: 5 } };
const read: Practice = { ...run, id: 'read', cadence: { kind: 'times', n: 3 } };
const med: Practice = { ...run, id: 'med', timeOfDay: 'evening' };
const water: Practice = { ...run, id: 'water', timeOfDay: 'morning' };
const mark = (r: string, date: string, tier?: Tier): Mark => ({ id: markId(r, date), ritualId: r, date, ...(tier ? { tier } : {}) });
const normal: ModeOf = () => 'normal';

const input = (over: Partial<FrontInput> = {}): FrontInput => ({
  practices: [run, water, med, mum, read],
  marks: [],
  modes: [],
  dayModes: [],
  now: new Date('2026-11-25T08:00:00'),
  dayEndsAt: 3,
  ...over,
});

it('turns the evening into a recap of everything due', () => {
  const p = frontPage(input({ now: new Date('2026-11-25T19:00:00') }));
  expect(p.recap).toBe(true);
  expect(p.groups.flatMap((g) => g.practices.map((x) => x.id)).sort()).toEqual(['med', 'read', 'run', 'water']);
});
it('moves n-a-week practices aside once the week is met, and never bulk-marks them', () => {
  const twice: Practice = { ...read, cadence: { kind: 'times', n: 2 } };
  const met = [mark('read', '2026-11-23'), mark('read', '2026-11-24')];
  expect(frontPage(input({ practices: [run, twice], marks: met })).alsoToday.map((x) => x.id)).toContain('read');
  const evening = frontPage(input({ now: new Date('2026-11-25T19:00:00') }));
  expect(allAsPlanned(evening, []).map((m) => m.ritualId).sort()).toEqual(['med', 'run', 'water']);
  expect(allAsPlanned(evening, []).every((m) => m.tier === 'target' && m.date === '2026-11-25')).toBe(true);
});
it('marks a little in Low energy, and asks nothing on a Day off', () => {
  const low = frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'low' }], now: new Date('2026-11-25T19:00:00') }));
  expect(tapTier(low.mode)).toBe('minimum');
  expect(tapTier('normal')).toBe('target');
  expect(allAsPlanned(low, []).every((m) => m.tier === 'minimum')).toBe(true);
  const off = frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] }));
  expect(allAsPlanned(off, [])).toEqual([]);
  expect(off.dueCount).toBe(0);
});
it('lists yesterday until midday, skipping a yesterday that was a Day off', () => {
  expect(frontPage(input()).yesterdayUnmarked.map((x) => x.id).sort()).toEqual(['med', 'run', 'water']);
  expect(frontPage(input({ now: new Date('2026-11-25T12:00:00') })).yesterdayUnmarked).toEqual([]);
  expect(frontPage(input({ dayModes: [{ id: '2026-11-24', date: '2026-11-24', mode: 'off' }] })).yesterdayUnmarked).toEqual([]);
});
it('uses the routine day after midnight', () => {
  const p = frontPage(input({ now: new Date('2026-11-26T00:30:00') }));
  expect(p.today).toBe('2026-11-25');
  expect(p.recap).toBe(true);
});
it('leaves out paused and not-yet-started practices', () => {
  const p = frontPage(input({ practices: [{ ...run, pausedOn: '2026-11-20' }, { ...water, startedOn: '2026-12-01' }] }));
  expect([...p.groups, ...p.alsoToday]).toEqual([]);
  expect(p.dueCount).toBe(0);
});
it('counts what is due today for Home', () => {
  const p = frontPage(input({ marks: [mark('run', '2026-11-25')] }));
  expect(p.dueCount).toBe(4);
  expect(p.markedDueCount).toBe(1);
});
it('sorts stably by start then name', () => {
  const a: Practice = { ...run, id: 'a', name: 'Zed', startedOn: '2026-01-01' };
  const b: Practice = { ...run, id: 'b', name: 'Amy', startedOn: '2026-01-01' };
  const c: Practice = { ...run, id: 'c', name: 'Old', startedOn: '2025-01-01' };
  expect(frontPage(input({ practices: [a, b, c] })).groups[0]!.practices.map((x) => x.id)).toEqual(['c', 'b', 'a']);
});
it('asks of a times practice the week less its Day-off days', () => {
  const oneOff: ModeOf = (d) => (d === '2026-11-27' ? 'off' : 'normal');
  expect(fullWeekTarget(read, '2026-11-23', normal)).toBe(3);
  expect(fullWeekTarget(read, '2026-11-23', oneOff)).toBe(2);
  expect(fullWeekTarget({ ...read, cadence: { kind: 'times', n: 1 } }, '2026-11-23', () => 'off')).toBe(0);
});
it('decides whether a practice is due on a day', () => {
  const idx = indexMarks([mark('read', '2026-11-23'), mark('read', '2026-11-24'), mark('read', '2026-11-25')]);
  expect(isDueOn(read, '2026-11-25', idx, normal)).toBe(true); // today's mark does not count against it
  expect(isDueOn(read, '2026-11-26', idx, normal)).toBe(false); // three already
  expect(isDueOn(run, '2026-11-26', idx, () => 'off')).toBe(false);
  expect(isDueOn(mum, '2026-11-28', idx, normal)).toBe(true);
  expect(isDueOn(mum, '2026-11-27', idx, normal)).toBe(false);
});

const shape = (gs: readonly { time: string; practices: readonly Practice[] }[]) => gs.map((g) => [g.time, g.practices.map((p) => p.id)]);
it('groups due practices by time of day in a fixed order', () => {
  const p = frontPage(input());
  expect(p.part).toBe('morning');
  expect(p.recap).toBe(false);
  expect(shape(p.groups)).toEqual([['morning', ['water']], ['evening', ['med']], ['anytime', ['run', 'read']]]);
  expect(p.alsoToday.map((x) => x.id)).toEqual(['mum']);
});
it('keeps the groups whatever is lit', () => {
  const p = frontPage(input({ marks: [mark('med', '2026-11-25'), mark('run', '2026-11-25')] }));
  expect(shape(p.groups)).toEqual([['morning', ['water']], ['evening', ['med']], ['anytime', ['run', 'read']]]);
});
it('puts every active practice in the groups on a Day off', () => {
  const off = frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] }));
  expect(off.groups.flatMap((g) => g.practices.map((p) => p.id))).toEqual(['water', 'med', 'run', 'mum', 'read']);
  expect(off.alsoToday).toEqual([]);
});
it('glows with the share of due practices lit', () => {
  expect(frontPage(input()).glow).toBe(0);
  expect(frontPage(input({ marks: [mark('run', '2026-11-25'), mark('med', '2026-11-25')] })).glow).toBe(0.5);
  expect(frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] })).glow).toBe(0);
});
it('groups any list by time of day', () => {
  expect(shape(groupByTime([read, med, water]))).toEqual([['morning', ['water']], ['evening', ['med']], ['anytime', ['read']]]);
});
