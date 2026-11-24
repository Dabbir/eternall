import type { ReadContext } from '@eternall/core';
import { clock, routeen } from './index';
import { copy } from './copy';
import type { Mark, Practice } from './practices';
import type { DayModeRecord, ModeRecord } from './modes';

const run = { id: 'run', name: 'Run', cadence: { kind: 'daily' }, startedOn: '2026-11-01', pausedOn: null } as unknown as Practice;
const mark = (id: string, date: string): Mark => ({ id: `${id}_${date}`, ritualId: id, date }) as Mark;

function fakeCtx({ practices = [], marks = [], modes = [], dayModes = [], today = '2026-11-25' }: { practices?: Practice[]; marks?: Mark[]; modes?: ModeRecord[]; dayModes?: DayModeRecord[]; today?: string } = {}) {
  const byPath: Record<string, unknown[]> = { 'refrain/ritual': practices, 'refrain/mark': marks, 'refrain/mode': modes, 'refrain/day-mode': dayModes, 'refrain/settings': [] };
  return { today, weekIndexOf: () => null, data: { collection: (p: string) => ({ all: () => byPath[p] ?? [] }) } } as unknown as ReadContext & { weekIndexOf(d: string): number | null };
}

const real = clock.now;
afterEach(() => {
  clock.now = real;
});

describe('routeen contributions', () => {
  it('counts today on Home with the routine day, so 00:30 is still yesterday', () => {
    clock.now = () => new Date('2026-11-26T00:30:00');
    const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-25')], today: '2026-11-26' });
    expect(routeen.home!(ctx).status).toBe(copy.home.status(1, 1));
  });
  it('reads Day off on Home and asks for nothing in the badge', () => {
    clock.now = () => new Date('2026-11-25T08:00:00');
    const ctx = fakeCtx({ practices: [run], modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] });
    expect(routeen.home!(ctx).status).toBe(copy.home.dayOff);
    expect(routeen.badge!(ctx)).toBeNull();
  });
  it('keeps the house lines as counts', () => {
    clock.now = () => new Date('2026-11-25T08:00:00');
    const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-23')] });
    expect(routeen.weekLines!(ctx, '2026-11-23', '2026-11-29')[0]!.text).toMatch(/^ROUTEEN · \d+ of \d+/);
    expect(JSON.stringify(routeen.almanacFacts!(ctx))).not.toMatch(/%/);
  });
  it('ignores the marks of removed practices on the lifeline and in the Almanac', () => {
    clock.now = () => new Date('2026-11-25T08:00:00');
    const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-23'), mark('gone', '2026-11-22'), mark('gone', '2026-11-21')] });
    (ctx as unknown as { weekIndexOf: (d: string) => number | null }).weekIndexOf = (d) => Number(d.slice(8));
    expect([...(routeen.lifeline!(ctx)?.markers?.keys() ?? [])]).toEqual([23]);
    const days = routeen.almanacFacts!(ctx).find((f) => f.label === copy.almanac.daysLit);
    expect(days?.value).toBe('1');
  });
  it('answers rituals.week for one practice and null for a removed one', () => {
    clock.now = () => new Date('2026-11-25T08:00:00');
    const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-24')] });
    const week = routeen.provides!({ ...ctx, navigate: () => {} } as never)['rituals.week'] as { week(id: string, start: string): { kept: boolean; notes: unknown } | null };
    expect(week.week('run', '2026-11-25')).toMatchObject({ notes: 1 });
    expect(week.week('gone', '2026-11-25')).toBeNull();
  });
  it('owns every refrain collection', () => {
    expect(routeen.collections).toEqual(expect.arrayContaining(['refrain/ritual', 'refrain/mark', 'refrain/look', 'refrain/mode', 'refrain/day-mode', 'refrain/settings']));
  });
});
