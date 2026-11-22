import {
  TONES,
  WEEKS_PER_ROW,
  diffDays,
  horizonEnd,
  locate,
  parseISO,
  weekIndex,
  type HouseProfile,
  type ISODate,
  type Memory,
  type Tone,
} from '@eternall/core';

const LUNAR_MONTH = 29.530588;
const RESTING_BPM = 72;

export interface Measures {
  /** Whether time is measured from birth (true) or from the first record (false). */
  fromBirth: boolean;
  since: ISODate;
  daysLived: number;
  weeksLived: number;
  weeksTotal: number | null;
  weeksRemaining: number | null;
  fractionLived: number | null;
  age: number | null;
  sunrises: number;
  fullMoons: number;
  seasons: number;
  heartbeats: number;
  summersAhead: number | null;
  weekendsAhead: number | null;
}

export function measure(profile: HouseProfile | null, today: ISODate, firstRecord: ISODate | null): Measures {
  const since = profile?.birthDate ?? firstRecord ?? today;
  const daysLived = Math.max(0, diffDays(since, today));
  const base = {
    since,
    daysLived,
    sunrises: daysLived,
    fullMoons: Math.floor(daysLived / LUNAR_MONTH),
    seasons: Math.floor(daysLived / 91.31),
    heartbeats: daysLived * 24 * 60 * RESTING_BPM,
  };
  if (!profile) {
    return { ...base, fromBirth: false, weeksLived: Math.floor(daysLived / 7), weeksTotal: null, weeksRemaining: null, fractionLived: null, age: null, summersAhead: null, weekendsAhead: null };
  }
  const here = locate(profile.birthDate, today) ?? { age: 0, week: 0 };
  const weeksTotal = profile.horizonYears * WEEKS_PER_ROW;
  const weeksLived = Math.min(weeksTotal, weekIndex(here));
  const daysRemaining = Math.max(0, diffDays(today, horizonEnd(profile.birthDate, profile.horizonYears)));
  return {
    ...base,
    fromBirth: true,
    weeksLived,
    weeksTotal,
    weeksRemaining: Math.max(0, weeksTotal - weeksLived),
    fractionLived: weeksLived / weeksTotal,
    age: here.age,
    summersAhead: Math.max(0, profile.horizonYears - here.age - (here.week > 26 ? 1 : 0)),
    weekendsAhead: Math.floor(daysRemaining / 7),
  };
}

/** Memories from the same time of year in earlier years: the same lifeline week, or ±3 days of the date. */
export function echoes(memories: readonly Memory[], profile: HouseProfile | null, today: ISODate): Memory[] {
  const out = memories.filter((m) => {
    // This year (or the future) is never an echo.
    if (m.date.slice(0, 4) >= today.slice(0, 4)) return false;
    if (profile) {
      const a = locate(profile.birthDate, m.date);
      const b = locate(profile.birthDate, today);
      return a !== null && b !== null && a.week === b.week && a.age < b.age;
    }
    const d = parseISO(`${today.slice(0, 4)}${m.date.slice(4)}`) - parseISO(today);
    return Math.abs(d) <= 3;
  });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Counts per year of life (with a profile) or per calendar year. */
export function perYear(memories: readonly Memory[], profile: HouseProfile | null, today: ISODate): { label: string; key: number; count: number }[] {
  if (profile) {
    const here = locate(profile.birthDate, today)?.age ?? 0;
    const counts = Array.from({ length: here + 1 }, () => 0);
    for (const m of memories) {
      const c = locate(profile.birthDate, m.date);
      if (c && c.age <= here) counts[c.age] = (counts[c.age] ?? 0) + 1;
    }
    const birthYear = Number(profile.birthDate.slice(0, 4));
    return counts.map((count, age) => ({ key: age, label: `Age ${age} · ${birthYear + age}`, count }));
  }
  const years = memories.map((m) => Number(m.date.slice(0, 4)));
  if (!years.length) return [];
  const min = Math.min(...years);
  const max = Number(today.slice(0, 4));
  const out: { label: string; key: number; count: number }[] = [];
  for (let y = min; y <= max; y++) out.push({ key: y, label: String(y), count: years.filter((x) => x === y).length });
  return out;
}

export function toneClimate(memories: readonly Memory[]): Record<Tone, number> {
  const tally = Object.fromEntries(TONES.map((t) => [t, 0])) as Record<Tone, number>;
  for (const m of memories) if (m.tone) tally[m.tone]++;
  return tally;
}

/** Longest run of consecutive weeks with a memory, and the run ending at the current (or previous) week. */
export function streaks(weeks: ReadonlySet<number>, nowIndex: number): { longest: number; current: number } {
  const sorted = [...weeks].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = Number.NEGATIVE_INFINITY;
  for (const w of sorted) {
    run = w === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = w;
  }
  let cursor = weeks.has(nowIndex) ? nowIndex : nowIndex - 1;
  let current = 0;
  while (weeks.has(cursor)) {
    current++;
    cursor--;
  }
  return { longest, current };
}

/** Week numbers counted from an anchor date, for streaks without a profile. */
export function weekNumbers(memories: readonly Memory[], anchor: ISODate): Set<number> {
  const out = new Set<number>();
  for (const m of memories) {
    const d = diffDays(anchor, m.date);
    if (d >= 0) out.add(Math.floor(d / 7));
  }
  return out;
}
