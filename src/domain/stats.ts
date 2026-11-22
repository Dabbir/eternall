import { capsuleStatus } from './capsule';
import { totalWeeks } from './lifeline';
import { diffDays, horizonEnd, locate, weekIndex } from './time';
import { TONES, type AppData, type Capsule, type ISODate, type Inscription, type Tone } from './types';

export interface Almanac {
  weeksLived: number;
  weeksTotal: number;
  weeksRemaining: number;
  fractionLived: number;
  daysLived: number;
  daysRemaining: number;
  age: number;
  weekOfYear: number;
  /** Reflective equivalents. */
  measures: {
    sunrises: number;
    fullMoons: number;
    seasons: number;
    heartbeats: number;
    summersAhead: number;
    weekendsAhead: number;
  };
  inscribedWeeks: number;
  coverage: number;
  longestStreak: number;
  currentStreak: number;
  perAge: number[];
  tones: Record<Tone, number>;
  echoes: Inscription[];
  nextCapsule: Capsule | null;
  readyCapsules: number;
}

const LUNAR_MONTH = 29.530588;
const RESTING_BPM = 72;

export function computeAlmanac(data: AppData, today: ISODate): Almanac | null {
  const p = data.profile;
  if (!p) return null;
  const here = locate(p.birthDate, today) ?? { age: 0, week: 0 };
  const weeksTotal = totalWeeks(p);
  const weeksLived = Math.min(weeksTotal, weekIndex(here));
  const daysLived = Math.max(0, diffDays(p.birthDate, today));
  const daysRemaining = Math.max(0, diffDays(today, horizonEnd(p.birthDate, p.horizonYears)));

  const weekSet = new Set<number>();
  const perAge = new Array<number>(Math.max(1, here.age + 1)).fill(0);
  const tones = Object.fromEntries(TONES.map((t) => [t, 0])) as Record<Tone, number>;
  for (const ins of data.inscriptions) {
    const c = locate(p.birthDate, ins.date);
    if (!c) continue;
    weekSet.add(weekIndex(c));
    if (c.age < perAge.length) perAge[c.age] = (perAge[c.age] ?? 0) + 1;
    tones[ins.tone]++;
  }

  const { longest, current } = streaks(weekSet, weekIndex(here));

  const echoes = data.inscriptions
    .filter((ins) => {
      const c = locate(p.birthDate, ins.date);
      return c !== null && c.week === here.week && c.age < here.age;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const upcoming = data.capsules
    .filter((c) => capsuleStatus(c, today) === 'sealed')
    .sort((a, b) => a.opensOn.localeCompare(b.opensOn));

  return {
    weeksLived,
    weeksTotal,
    weeksRemaining: Math.max(0, weeksTotal - weeksLived),
    fractionLived: weeksTotal ? weeksLived / weeksTotal : 0,
    daysLived,
    daysRemaining,
    age: here.age,
    weekOfYear: here.week,
    measures: {
      sunrises: daysLived,
      fullMoons: Math.floor(daysLived / LUNAR_MONTH),
      seasons: Math.floor(daysLived / 91.31),
      heartbeats: daysLived * 24 * 60 * RESTING_BPM,
      summersAhead: Math.max(0, p.horizonYears - here.age - (here.week > 26 ? 1 : 0)),
      weekendsAhead: Math.floor(daysRemaining / 7),
    },
    inscribedWeeks: weekSet.size,
    coverage: weeksLived ? weekSet.size / (weeksLived + 1) : 0,
    longestStreak: longest,
    currentStreak: current,
    perAge,
    tones,
    echoes,
    nextCapsule: upcoming[0] ?? null,
    readyCapsules: data.capsules.filter((c) => capsuleStatus(c, today) === 'ready').length,
  };
}

/** Longest run of consecutive inscribed weeks, and the run ending at the current (or previous) week. */
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
  // A streak stays alive through the current week even if this week isn't inscribed yet.
  let cursor = weeks.has(nowIndex) ? nowIndex : nowIndex - 1;
  let current = 0;
  while (weeks.has(cursor)) {
    current++;
    cursor--;
  }
  return { longest, current };
}

/** Plain-language search across title and body. All terms must match. */
export function searchInscriptions(list: readonly Inscription[], query: string): Inscription[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...list];
  return list.filter((ins) => {
    const hay = `${ins.title}\n${ins.body}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

