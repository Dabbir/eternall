import { echoes, measure, perYear, streaks, toneClimate } from './stats';
import type { Memory } from '@eternall/core';

const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };
const mem = (id: string, date: string, tone?: Memory['tone']): Memory => ({ imprint: 'amazeen', id, date, title: id, href: '#', ...(tone ? { tone } : {}) });

describe('measure', () => {
  it('measures a life against its horizon', () => {
    const m = measure(profile, '2026-11-20', null);
    expect(m.age).toBe(36);
    expect(m.weeksTotal).toBe(4680);
    expect(m.weeksLived + m.weeksRemaining!).toBe(4680);
  });
  it('measures from the first record without a profile', () => {
    const m = measure(null, '2026-11-20', '2026-11-06');
    expect(m.fromBirth).toBe(false);
    expect(m.daysLived).toBe(14);
    expect(m.weeksTotal).toBeNull();
  });
});

describe('echoes', () => {
  const list = [mem('a', '2025-11-21'), mem('b', '2024-11-22'), mem('c', '2026-11-16'), mem('d', '2020-03-01')];
  it('finds the same lifeline week in earlier years', () => {
    expect(echoes(list, profile, '2026-11-20').map((m) => m.id)).toEqual(['a', 'b']);
  });
  it('falls back to ±3 days of the date without a profile', () => {
    expect(echoes(list, null, '2026-11-20').map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('aggregates', () => {
  it('counts per year and tone', () => {
    const list = [mem('a', '2025-01-01', 'joy'), mem('b', '2026-01-01', 'joy'), mem('c', '2026-02-01', 'grief')];
    expect(perYear(list, null, '2026-11-20').map((y) => y.count)).toEqual([1, 2]);
    expect(toneClimate(list)).toMatchObject({ joy: 2, grief: 1, calm: 0 });
  });
  it('finds streaks', () => {
    expect(streaks(new Set([1, 2, 3, 7, 8]), 9)).toEqual({ longest: 3, current: 2 });
    expect(streaks(new Set(), 5)).toEqual({ longest: 0, current: 0 });
  });
});
