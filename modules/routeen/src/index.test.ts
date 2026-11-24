import type { ReadContext } from '@eternall/core';
import { clock, routeen } from './index';
import { copy } from './copy';
import type { Mark, Practice } from './practices';
import type { DayModeRecord, ModeRecord } from './modes';

const run = { id: 'run', name: 'Run', cadence: { kind: 'daily' }, startedOn: '2026-11-01', pausedOn: null } as unknown as Practice;
const mark = (id: string, date: string): Mark => ({ id: `${id}_${date}`, ritualId: id, date }) as Mark;

function fakeCtx({ practices = [], marks = [], modes = [], dayModes = [], today = '2026-11-25' }: { practices?: Practice[]; marks?: Mark[]; modes?: ModeRecord[]; dayModes?: DayModeRecord[]; today?: string } = {}) {
  const byPath: Record<string, unknown[]> = { 'refrain/ritual': practices, 'refrain/mark': marks, 'refrain/mode': modes, 'refrain/dayMode': dayModes, 'refrain/settings': [] };
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
  it('owns every refrain collection', () => {
    expect(routeen.collections).toEqual(expect.arrayContaining(['refrain/ritual', 'refrain/mark', 'refrain/look', 'refrain/mode', 'refrain/dayMode', 'refrain/settings']));
  });
});
