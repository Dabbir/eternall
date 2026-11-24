import { addDays, type ISODate } from '@eternall/core';
import type { Mode, ModeOf } from './modes';
import { barDays, barStart, isActiveOn, markId, tierOf, weekdayOf, type Mark, type Practice, type Tier } from './practices';

/** How one practice reads on one day of the sky. */
export type DayState = 'lit-minimum' | 'lit-target' | 'lit-more' | 'unlit' | 'open' | 'rest' | 'plain' | 'future';

export type MarkIndex = ReadonlyMap<string, Mark>;
export const indexMarks = (marks: readonly Mark[]): MarkIndex => new Map(marks.map((m) => [markId(m.ritualId, m.date), m]));

/** Active, and daily or weekly on its weekday. A "times a week" practice is never scheduled on a day. */
export function isScheduledOn(p: Practice, date: ISODate): boolean {
  if (!isActiveOn(p, date)) return false;
  if (p.cadence.kind === 'daily') return true;
  if (p.cadence.kind === 'weekly') return weekdayOf(date) === p.cadence.weekday;
  return false;
}

export function dayState(p: Practice, date: ISODate, idx: MarkIndex, modeOf: ModeOf, today: ISODate): DayState {
  const m = idx.get(markId(p.id, date));
  if (m) return `lit-${tierOf(m)}`;
  if (!isActiveOn(p, date)) return 'plain';
  if (date > today) return 'future';
  if (modeOf(date) === 'off') return 'rest';
  if (!isScheduledOn(p, date)) return 'plain';
  return date === today ? 'open' : 'unlit';
}

/** What the week asks of a practice so far; Day-off days are never asked for. Low energy changes nothing. */
export function weekTarget(p: Practice, start: ISODate, today: ISODate, modeOf: ModeOf): number {
  const days = barDays(start).filter((d) => isActiveOn(p, d));
  const onDays = days.filter((d) => d <= today && modeOf(d) !== 'off');
  if (p.cadence.kind === 'daily') return onDays.length;
  if (p.cadence.kind === 'weekly') {
    const weekday = p.cadence.weekday;
    return onDays.some((d) => weekdayOf(d) === weekday) ? 1 : 0;
  }
  // n a week: asked of only once the week has ended, less the days off.
  if (today < addDays(start, 6) || !days.length) return 0;
  return Math.max(0, p.cadence.n - barDays(start).filter((d) => modeOf(d) === 'off').length);
}

export const marksInWeek = (p: Practice, start: ISODate, idx: MarkIndex): number => barDays(start).filter((d) => idx.has(markId(p.id, d))).length;

export function isKeptInWeek(p: Practice, start: ISODate, idx: MarkIndex, today: ISODate, modeOf: ModeOf): boolean {
  if (!barDays(start).some((d) => d <= today && isActiveOn(p, d))) return false;
  const target = weekTarget(p, start, today, modeOf);
  const marks = marksInWeek(p, start, idx);
  return target === 0 ? marks > 0 : marks >= target;
}

/** Only practices the week has asked something of so far (or that already have a mark) are counted. */
export function weekSummary(ps: readonly Practice[], idx: MarkIndex, start: ISODate, today: ISODate, modeOf: ModeOf): { kept: number; active: number } {
  const active = ps.filter(
    (p) => barDays(start).some((d) => d <= today && isActiveOn(p, d)) && (weekTarget(p, start, today, modeOf) > 0 || marksInWeek(p, start, idx) > 0),
  );
  return { active: active.length, kept: active.filter((p) => isKeptInWeek(p, start, idx, today, modeOf)).length };
}

export interface DaySky {
  date: ISODate;
  /** The brightest tier kept that day, across every practice. */
  light: Tier | null;
  mode: Mode;
  /** Some practice was scheduled that day. */
  expected: boolean;
  future: boolean;
}

const RANK: Record<Tier, number> = { minimum: 1, target: 2, more: 3 };

export function daySky(ps: readonly Practice[], idx: MarkIndex, date: ISODate, today: ISODate, modeOf: ModeOf): DaySky {
  let light: Tier | null = null;
  for (const p of ps) {
    const m = idx.get(markId(p.id, date));
    if (m && (!light || RANK[tierOf(m)] > RANK[light])) light = tierOf(m);
  }
  return { date, light, mode: modeOf(date), expected: ps.some((p) => isScheduledOn(p, date)), future: date > today };
}

export const weekSky = (ps: readonly Practice[], idx: MarkIndex, start: ISODate, today: ISODate, modeOf: ModeOf): DaySky[] =>
  barDays(start).map((d) => daySky(ps, idx, d, today, modeOf));

/** 52 weeks of Monday-first rows; the last is this week. */
export function yearSky(ps: readonly Practice[], idx: MarkIndex, today: ISODate, modeOf: ModeOf): DaySky[][] {
  const first = addDays(barStart(today), -7 * 51);
  return Array.from({ length: 52 }, (_, i) => weekSky(ps, idx, addDays(first, 7 * i), today, modeOf));
}

/** Days of the year with at least one mark. */
export const litDays = (marks: readonly Mark[], year: string): number => new Set(marks.filter((m) => m.date.startsWith(year)).map((m) => m.date)).size;

/** The practice kept in most of the last 52 weeks (at least 2); ties go to the older one. */
export function steadiest(ps: readonly Practice[], idx: MarkIndex, today: ISODate, modeOf: ModeOf): { practice: Practice; weeks: number } | null {
  const oldest = addDays(barStart(today), -7 * 51);
  let best: { practice: Practice; weeks: number } | null = null;
  for (const p of ps) {
    let weeks = 0;
    for (let s = barStart(p.startedOn) > oldest ? barStart(p.startedOn) : oldest; s <= today; s = addDays(s, 7)) {
      if (isKeptInWeek(p, s, idx, today, modeOf)) weeks++;
    }
    if (weeks >= 2 && (!best || weeks > best.weeks || (weeks === best.weeks && p.startedOn < best.practice.startedOn))) best = { practice: p, weeks };
  }
  return best;
}
