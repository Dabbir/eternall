import { copy } from './copy';

describe('copy', () => {
  it('never says missed, streak or percent', () => {
    const text = JSON.stringify(copy, (_k, v) => (typeof v === 'function' ? v(2, 4) : v));
    expect(text).not.toMatch(/missed|streak|%|failed/i);
  });
  it('holds the spec strings', () => {
    expect(copy.fn).toBe('A routine that bends with your day');
    expect(copy.tiers).toEqual({ minimum: 'a little', target: 'as planned', more: 'more' });
    expect(copy.modes).toEqual({ normal: 'Normal', low: 'Low energy', off: 'Day off' });
    expect(copy.places).toEqual({ today: 'Today', sky: 'Sky' });
    expect(copy.yesterday(3)).toBe('Yesterday: 3 not marked');
    expect(copy.home.status(1, 2)).toBe('1 of 2 marked today');
    expect(copy.sky.title).toBe('The sky');
    expect(copy.day.thatDay).toBe('That day');
    expect(copy.weekLine(1, 2)).toMatch(/^ROUTEEN · 1 of 2/);
  });
});
