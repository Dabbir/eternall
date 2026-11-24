import { dayModeChange, modeOfFn, modeOn, modeRecord, offerBackToNormal, runningMode, isModeUnchanged, type ModeRecord } from './modes';

const r = (from: string, mode: ModeRecord['mode']): ModeRecord => ({ id: from, from, mode });

it('is Normal with no records, then follows the latest change on or before the day', () => {
  const modes = [r('2026-11-20', 'low'), r('2026-11-23', 'off')];
  expect(runningMode('2026-11-19', [])).toBe('normal');
  expect(runningMode('2026-11-19', modes)).toBe('normal');
  expect(runningMode('2026-11-21', modes)).toBe('low');
  expect(runningMode('2026-11-25', modes)).toBe('off');
});
it('lets one past day carry its own mode without changing the running one', () => {
  const modes = [r('2026-11-01', 'normal')];
  const day = [{ id: '2026-11-24', date: '2026-11-24', mode: 'off' as const }];
  expect(modeOn('2026-11-24', modes, day)).toBe('off');
  expect(modeOn('2026-11-25', modes, day)).toBe('normal');
});
it('builds a lookup from both record kinds', () => {
  const f = modeOfFn([r('2026-11-01', 'low')], [{ id: '2026-11-24', date: '2026-11-24', mode: 'off' }]);
  expect(f('2026-11-24')).toBe('off');
  expect(f('2026-11-25')).toBe('low');
});
it('keys a change by its day, so two changes on one day leave one record', () => {
  expect(modeRecord('2026-11-25', 'low')).toEqual({ id: '2026-11-25', from: '2026-11-25', mode: 'low' });
});
it('drops a day override that equals the running mode', () => {
  const modes = [r('2026-11-01', 'low')];
  expect(dayModeChange('2026-11-24', 'low', modes)).toEqual({ remove: '2026-11-24' });
  expect(dayModeChange('2026-11-24', 'off', modes)).toEqual({ put: { id: '2026-11-24', date: '2026-11-24', mode: 'off' } });
});
it('offers Back to Normal after three days away, once a day', () => {
  const modes = [r('2026-11-22', 'low')];
  expect(offerBackToNormal('2026-11-24', modes, null)).toBe(false);
  expect(offerBackToNormal('2026-11-25', modes, null)).toBe(true);
  expect(offerBackToNormal('2026-11-25', modes, '2026-11-25')).toBe(false);
  expect(offerBackToNormal('2026-11-25', [r('2026-11-01', 'normal')], null)).toBe(false);
});

describe('isModeUnchanged', () => {
  const low: ModeRecord = { id: '2026-11-20', from: '2026-11-20', mode: 'low' };
  it('is true only for the running mode with no override today', () => {
    expect(isModeUnchanged('2026-11-25', 'low', [low], [])).toBe(true);
    expect(isModeUnchanged('2026-11-25', 'normal', [low], [])).toBe(false);
    expect(isModeUnchanged('2026-11-25', 'low', [low], [{ id: '2026-11-25', date: '2026-11-25', mode: 'off' }])).toBe(false);
    expect(isModeUnchanged('2026-11-25', 'normal', [], [])).toBe(true);
  });
});
