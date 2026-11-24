import { DEFAULT_DAY_ENDS_AT, partOfDay, readSettings, routineDay, sunPosition } from './sky';
const at = (iso: string) => new Date(iso); // local time, e.g. '2026-11-25T00:30:00'

describe('the routine day', () => {
  it('ends at 03:00 by default, so 00:30 still belongs to yesterday', () => {
    expect(routineDay(at('2026-11-25T00:30:00'), 3)).toBe('2026-11-24');
    expect(routineDay(at('2026-11-25T03:00:00'), 3)).toBe('2026-11-25');
    expect(routineDay(at('2026-11-25T00:30:00'), 0)).toBe('2026-11-25');
  });
  it('splits the day into morning, midday and evening', () => {
    expect(partOfDay(at('2026-11-25T03:00:00'), 3)).toBe('morning');
    expect(partOfDay(at('2026-11-25T10:59:00'), 3)).toBe('morning');
    expect(partOfDay(at('2026-11-25T11:00:00'), 3)).toBe('midday');
    expect(partOfDay(at('2026-11-25T17:00:00'), 3)).toBe('evening');
    expect(partOfDay(at('2026-11-26T01:00:00'), 3)).toBe('evening');
  });
  it('places the sun from 0 at the start of the day to 1 at its end', () => {
    expect(sunPosition(at('2026-11-25T03:00:00'), 3)).toBe(0);
    expect(sunPosition(at('2026-11-25T15:00:00'), 3)).toBeCloseTo(0.5);
    expect(sunPosition(at('2026-11-26T02:59:00'), 3)).toBeGreaterThan(0.99);
  });
});

describe('settings', () => {
  it('defaults and clamps', () => {
    expect(readSettings(undefined)).toEqual({ id: 'settings', dayEndsAt: DEFAULT_DAY_ENDS_AT, backToNormalDismissedOn: null });
    expect(readSettings({ dayEndsAt: 9 }).dayEndsAt).toBe(5);
    expect(readSettings({ dayEndsAt: -1 }).dayEndsAt).toBe(0);
    expect(readSettings({ dayEndsAt: 2.5 }).dayEndsAt).toBe(DEFAULT_DAY_ENDS_AT);
  });
  it('keeps a valid dismissal date and drops anything else', () => {
    expect(readSettings({ backToNormalDismissedOn: '2026-11-24' }).backToNormalDismissedOn).toBe('2026-11-24');
    expect(readSettings({ backToNormalDismissedOn: 'soon' }).backToNormalDismissedOn).toBeNull();
  });
});
