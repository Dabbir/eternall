import { addYears } from './time';
import { formatCountdown, formatRange, ordinal } from './format';

describe('formatCountdown', () => {
  it('reads exact anniversaries as whole years', () => {
    for (const y of [1, 2, 5, 10, 40]) {
      expect(formatCountdown('2026-11-20', addYears('2026-11-20', y))).toBe(`in ${y} year${y === 1 ? '' : 's'}`);
    }
  });
  it('uses days and months for short waits', () => {
    expect(formatCountdown('2026-11-20', '2026-11-20')).toBe('today');
    expect(formatCountdown('2026-11-20', '2026-11-21')).toBe('tomorrow');
    expect(formatCountdown('2026-11-20', '2026-12-02')).toBe('in 12 days');
    expect(formatCountdown('2026-11-20', '2027-03-20')).toBe('in 4 months');
    expect(formatCountdown('2026-11-20', '2028-11-25')).toBe('in 2 years, 5 days');
  });
});

describe('formatRange', () => {
  it('collapses shared months and years', () => {
    expect(formatRange('2025-03-03', '2025-03-09')).toBe('3 – 9 March 2025');
    expect(formatRange('2025-03-28', '2025-04-03')).toBe('28 March – 3 April 2025');
  });
});

describe('ordinal', () => {
  it('handles teens', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 35].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '35th']);
  });
});
