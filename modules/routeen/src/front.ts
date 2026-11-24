import { addDays, type ISODate } from '@eternall/core';
import { indexMarks, isScheduledOn, type MarkIndex } from './days';
import { modeOfFn, type DayModeRecord, type Mode, type ModeOf, type ModeRecord } from './modes';
import { barDays, barStart, isActiveOn, markId, timeOf, weekdayOf, type Mark, type Practice, type Tier } from './practices';
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

export interface FrontPage {
  today: ISODate;
  yesterday: ISODate;
  part: Part;
  mode: Mode;
  /** In the evening the page recaps everything due. */
  recap: boolean;
  forNow: Practice[];
  notYet: Practice[];
  alsoToday: Practice[];
  ifYouLike: Practice[];
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

  let forNow: Practice[] = [];
  let notYet: Practice[] = [];
  if (mode !== 'off') {
    forNow = recap ? due : due.filter((p) => marked(p) || timeOf(p) === 'anytime' || timeOf(p) === part);
    notYet = due.filter((p) => !forNow.includes(p));
  }
  const dueSet = new Set(mode === 'off' ? [] : due);
  const yesterdayUnmarked =
    part === 'morning' && modeOf(yesterday) !== 'off' ? input.practices.filter((p) => isScheduledOn(p, yesterday) && !idx.has(markId(p.id, yesterday))) : [];

  return {
    today,
    yesterday,
    part,
    mode,
    recap,
    forNow: ordered(forNow),
    notYet: ordered(notYet),
    alsoToday: ordered(mode === 'off' ? [] : active.filter((p) => !dueSet.has(p))),
    ifYouLike: mode === 'off' ? ordered(active) : [],
    yesterdayUnmarked: ordered(yesterdayUnmarked),
    dueCount: dueSet.size,
    markedDueCount: [...dueSet].filter(marked).length,
  };
}

/** The marks the evening's "all as planned" writes: unmarked, not n a week, never on a Day off. */
export function allAsPlanned(page: FrontPage, marks: readonly Mark[]): Mark[] {
  if (page.mode === 'off' || !page.recap) return [];
  const idx = indexMarks(marks);
  return page.forNow
    .filter((p) => p.cadence.kind !== 'times' && !idx.has(markId(p.id, page.today)))
    .map((p) => ({ id: markId(p.id, page.today), ritualId: p.id, date: page.today, tier: tapTier(page.mode) }));
}
