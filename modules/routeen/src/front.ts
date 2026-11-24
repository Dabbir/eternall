import { addDays, type ISODate } from '@eternall/core';
import { indexMarks, isScheduledOn, type MarkIndex } from './days';
import { modeOfFn, type DayModeRecord, type Mode, type ModeOf, type ModeRecord } from './modes';
import { barDays, barStart, isActiveOn, markId, timeOf, weekdayOf, type Mark, type Practice, type Tier, type TimeOfDay } from './practices';
import { partOfDay, routineDay, type Part } from './sky';

/** The front page of ROUTEEN: what is for now, what comes later, and yesterday's gaps. */
export interface FrontInput {
  practices: readonly Practice[];
  marks: readonly Mark[];
  modes: readonly ModeRecord[];
  dayModes: readonly DayModeRecord[];
  now: Date;
  dayEndsAt: number;
}

/** Practices that share a time of day; the page lists them in a fixed order (ADR 0016). */
export interface Group {
  time: TimeOfDay;
  practices: Practice[];
}

export interface FrontPage {
  today: ISODate;
  yesterday: ISODate;
  part: Part;
  mode: Mode;
  /** In the evening the page recaps everything due. */
  recap: boolean;
  /** Due practices (every active one on a Day off) by time of day, in a fixed order; never moved by a mark. */
  groups: Group[];
  /** How much of what is due is lit, 0..1 (of what is listed, when nothing is due); the sky brightens with it. Never a number on screen. */
  glow: number;
  /** Active but not due today (an n-a-week practice already met, a weekly one on another day); empty on a Day off. */
  alsoToday: Practice[];
  yesterdayUnmarked: Practice[];
  dueCount: number;
  markedDueCount: number;
}

/** What a whole week asks of an "n a week" practice: n, less its active Day-off days. */
export function fullWeekTarget(p: Practice, start: ISODate, modeOf: ModeOf): number {
  if (p.cadence.kind !== 'times') return 0;
  const off = barDays(start).filter((d) => isActiveOn(p, d) && modeOf(d) === 'off').length;
  return Math.max(0, p.cadence.n - off);
}

/** Due on a day: active, not a Day off, and (for n a week) the week's other days have not already met it. */
export function isDueOn(p: Practice, date: ISODate, idx: MarkIndex, modeOf: ModeOf): boolean {
  if (!isActiveOn(p, date) || modeOf(date) === 'off') return false;
  if (p.cadence.kind === 'daily') return true;
  if (p.cadence.kind === 'weekly') return weekdayOf(date) === p.cadence.weekday;
  const start = barStart(date);
  const others = barDays(start).filter((d) => d !== date && idx.has(markId(p.id, d))).length;
  return others < fullWeekTarget(p, start, modeOf);
}

/** A tap marks Minimum in Low energy, otherwise Target. */
export const tapTier = (mode: Mode): Tier => (mode === 'low' ? 'minimum' : 'target');

const byStartThenName = (a: Practice, b: Practice): number => (a.startedOn < b.startedOn ? -1 : a.startedOn > b.startedOn ? 1 : a.name.localeCompare(b.name));
const ordered = (ps: readonly Practice[]): Practice[] => [...ps].sort(byStartThenName); // Array.sort is stable

const TIMES: readonly TimeOfDay[] = ['morning', 'midday', 'evening', 'anytime'];

/** Any list by time of day: morning, midday, evening, any time; empty groups left out; each in start-then-name order. */
export function groupByTime(ps: readonly Practice[]): Group[] {
  return TIMES.map((time) => ({ time, practices: ordered(ps.filter((p) => timeOf(p) === time)) })).filter((g) => g.practices.length > 0);
}

export function frontPage(input: FrontInput): FrontPage {
  const { now, dayEndsAt } = input;
  const today = routineDay(now, dayEndsAt);
  const yesterday = addDays(today, -1);
  const part = partOfDay(now, dayEndsAt);
  const modeOf = modeOfFn(input.modes, input.dayModes);
  const mode = modeOf(today);
  const idx = indexMarks(input.marks);
  const marked = (p: Practice) => idx.has(markId(p.id, today));
  const recap = part === 'evening';

  const active = input.practices.filter((p) => isActiveOn(p, today));
  const due = active.filter((p) => isDueOn(p, today, idx, modeOf));

  const dueSet = new Set(mode === 'off' ? [] : due);
  const yesterdayUnmarked =
    part === 'morning' && modeOf(yesterday) !== 'off' ? input.practices.filter((p) => isScheduledOn(p, yesterday) && !idx.has(markId(p.id, yesterday))) : [];

  const dueCount = dueSet.size;
  const markedDueCount = [...dueSet].filter(marked).length;
  // When nothing is due (a Day off, a quiet weekday) the sky still lights with what is listed and lit.
  const listed = mode === 'off' ? active : active.filter((p) => !dueSet.has(p));
  return {
    today,
    yesterday,
    part,
    mode,
    recap,
    groups: groupByTime(mode === 'off' ? active : due),
    glow: dueCount ? markedDueCount / dueCount : listed.length ? listed.filter(marked).length / listed.length : 0,
    alsoToday: ordered(mode === 'off' ? [] : active.filter((p) => !dueSet.has(p))),
    yesterdayUnmarked: ordered(yesterdayUnmarked),
    dueCount,
    markedDueCount,
  };
}

/** The marks the evening's "all as planned" writes: unmarked, not n a week, never on a Day off. */
export function allAsPlanned(page: FrontPage, marks: readonly Mark[]): Mark[] {
  if (page.mode === 'off' || !page.recap) return [];
  const idx = indexMarks(marks);
  return page.groups
    .flatMap((g) => g.practices)
    .filter((p) => p.cadence.kind !== 'times' && !idx.has(markId(p.id, page.today)))
    .map((p) => ({ id: markId(p.id, page.today), ritualId: p.id, date: page.today, tier: tapTier(page.mode) }));
}
