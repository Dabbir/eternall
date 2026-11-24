import { addDays, cleanText, finish, isValidISO, parseISO, requireText, type FieldErrors, type ISODate, type Validation } from '@eternall/core';

/**
 * ROUTEEN's domain (docs/MODULES.md §6, docs/design/routeen.md; once REFRAIN): each practice is a
 * thread on the loom, a week is a strip of seven rows (Mon→Sun), a kept day is a woven stitch and an
 * expected day that passed leaves the bare warp showing. Nothing here counts streaks or failures.
 * Records keep their `refrain/*` paths (docs/adr/0014).
 */
export const PRACTICE_PATH = 'refrain/ritual';
export const MARK_PATH = 'refrain/mark';
export const LIMITS = { name: 60, why: 400 } as const;

export type Cadence = { kind: 'daily' } | { kind: 'times'; n: number } | { kind: 'weekly'; weekday: number };

/** Natural dyes for the threads, in turn; each has its own weave pattern too, so no thread relies on colour. */
export const DYES = ['indigo', 'madder', 'weld', 'walnut', 'lichen', 'iron'] as const;
export type Dye = (typeof DYES)[number];
export const PATTERNS = ['plain', 'twill', 'dotted', 'rib', 'herringbone', 'basket'] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface Practice {
  id: string;
  name: string;
  why: string;
  cadence: Cadence;
  /** Which thread it is woven in (an index into DYES and PATTERNS). */
  thread?: number;
  /** REFRAIN's old pitch: read as the thread when a practice has none, so old practices keep distinct threads. */
  pitch?: number;
  startedOn: ISODate;
  pausedOn: ISODate | null;
}

/** One kept day. The id is `${ritualId}_${date}` (vault ids allow no colons), so a day can only be kept once. */
export interface Mark {
  id: string;
  ritualId: string;
  date: ISODate;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const markId = (ritualId: string, date: ISODate) => `${ritualId}_${date}`;

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: ISODate) => (((parseISO(date) + 3) % 7) + 7) % 7;
/** The Monday that starts the bar containing `date`. */
export const barStart = (date: ISODate) => addDays(date, -weekdayOf(date));
export const barDays = (start: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDays(start, i));

/** The thread a practice is woven in. */
export const threadOf = (p: Pick<Practice, 'thread' | 'pitch'>): number => (p.thread ?? p.pitch ?? 0) % DYES.length;
export const dyeOf = (p: Pick<Practice, 'thread' | 'pitch'>): Dye => DYES[threadOf(p)]!;
export const patternOf = (p: Pick<Practice, 'thread' | 'pitch'>): Pattern => PATTERNS[threadOf(p)]!;

/** The first thread not yet on the loom, so a new practice is told apart from the others. */
export function nextThread(practices: readonly Pick<Practice, 'thread' | 'pitch'>[]): number {
  const used = new Set(practices.map(threadOf));
  for (let i = 0; i < DYES.length; i++) if (!used.has(i)) return i;
  return practices.length % DYES.length;
}

export const isActiveOn = (r: Pick<Practice, 'startedOn' | 'pausedOn'>, date: ISODate) => date >= r.startedOn && (r.pausedOn === null || date < r.pausedOn);

export type Stitch = 'woven' | 'warp' | 'open' | 'plain' | 'future' | 'off';

/**
 * How one day of a practice reads in the cloth:
 * woven (kept: a coloured stitch) · warp (an expected day that passed unkept: the bare warp shows,
 * never red) · open (still free to weave: today, or a day of a "n times a week" practice) ·
 * plain (not expected: plain undyed weave) · future · off (before it began, or paused).
 */
export function stitchOf(p: Practice, date: ISODate, kept: ReadonlySet<string>, today: ISODate): Stitch {
  if (kept.has(markId(p.id, date))) return 'woven';
  if (!isActiveOn(p, date)) return 'off';
  if (date > today) return 'future';
  if (p.cadence.kind === 'daily') return date === today ? 'open' : 'warp';
  if (p.cadence.kind === 'weekly') return weekdayOf(date) === p.cadence.weekday ? (date === today ? 'open' : 'warp') : 'plain';
  return 'open';
}

/** A strip of cloth: each practice's seven stitches for the week starting `start`, in loom order. */
export function weave(practices: readonly Practice[], marks: readonly Mark[], start: ISODate, today: ISODate): { practice: Practice; stitches: Stitch[] }[] {
  const kept = keySet(marks);
  return practices.map((p) => ({ practice: p, stitches: barDays(start).map((d) => stitchOf(p, d, kept, today)) }));
}

/** How many notes the bar asks for, counting only days that have arrived (so the current bar is fair). */
export function expectedIn(r: Practice, start: ISODate, today: ISODate): number {
  const days = barDays(start).filter((d) => d <= today && isActiveOn(r, d));
  if (r.cadence.kind === 'daily') return days.length;
  if (r.cadence.kind === 'weekly') return days.some((d) => weekdayOf(d) === (r.cadence as { weekday: number }).weekday) ? 1 : 0;
  // n per week: the full n once the bar is over; while it runs, never more than the days left allow.
  const end = addDays(start, 6);
  if (today >= end) return days.length ? Math.min(r.cadence.n, days.length) : 0;
  return 0;
}

export function keptIn(r: Practice, start: ISODate, kept: ReadonlySet<string>): number {
  return barDays(start).filter((d) => kept.has(markId(r.id, d))).length;
}

/** A practice is kept in a week when it has as many stitches as the week asked for (and was active). */
export function isKeptIn(r: Practice, start: ISODate, kept: ReadonlySet<string>, today: ISODate): boolean {
  const active = barDays(start).some((d) => d <= today && isActiveOn(r, d));
  if (!active) return false;
  const want = expectedIn(r, start, today);
  const have = keptIn(r, start, kept);
  return want === 0 ? have > 0 : have >= want;
}

export interface BarSummary {
  kept: number;
  active: number;
  notes: number;
}
export function barSummary(rituals: readonly Practice[], marks: readonly Mark[], start: ISODate, today: ISODate): BarSummary {
  const kept = keySet(marks);
  // Only practices the week has asked something of so far (or that already have a stitch) are counted,
  // so Saturday's call doesn't read as "not kept" on a Monday.
  const active = rituals.filter((r) => barDays(start).some((d) => d <= today && isActiveOn(r, d)) && (expectedIn(r, start, today) > 0 || keptIn(r, start, kept) > 0));
  return {
    active: active.length,
    kept: active.filter((r) => isKeptIn(r, start, kept, today)).length,
    notes: marks.filter((m) => m.date >= start && m.date <= addDays(start, 6)).length,
  };
}

export const keySet = (marks: readonly Mark[]) => new Set(marks.map((m) => m.id));

/** The practices expected today (for the "Mark today" sheet). */
export function dueToday(rituals: readonly Practice[], today: ISODate): Practice[] {
  return rituals.filter((r) => isActiveOn(r, today) && (r.cadence.kind !== 'weekly' || r.cadence.weekday === weekdayOf(today)));
}

/** The year's cloth for one thread: stitches woven in each of the 52 weeks ending with this one. */
export function clothLine(r: Practice, marks: readonly Mark[], today: ISODate): number[] {
  const kept = keySet(marks.filter((m) => m.ritualId === r.id));
  const last = barStart(today);
  return Array.from({ length: 52 }, (_, i) => keptIn(r, addDays(last, (i - 51) * 7), kept));
}

export interface PracticeStats {
  totalMarks: number;
  mostConstant: { practice: Practice; ratio: number } | null;
  keptThisYear: number;
}

/** For the Almanac: totals, the practice kept in the largest share of its weeks, stitches this year. */
export function practiceStats(rituals: readonly Practice[], marks: readonly Mark[], today: ISODate): PracticeStats {
  const kept = keySet(marks);
  let best: PracticeStats['mostConstant'] = null;
  for (const r of rituals) {
    let bars = 0;
    let ok = 0;
    for (let s = barStart(r.startedOn); s <= today; s = addDays(s, 7)) {
      if (s > addDays(today, -7 * 52)) {
        bars++;
        if (isKeptIn(r, s, kept, today)) ok++;
      }
    }
    if (bars >= 2 && (!best || ok / bars > best.ratio)) best = { practice: r, ratio: ok / bars };
  }
  const year = today.slice(0, 4);
  return { totalMarks: marks.length, mostConstant: best, keptThisYear: marks.filter((m) => m.date.startsWith(year)).length };
}

export interface PracticeInput {
  name: string;
  why: string;
  cadence: Cadence;
  startedOn: string;
}

export function validatePractice(input: PracticeInput, today: ISODate): Validation<Omit<Practice, 'id' | 'thread' | 'pitch' | 'pausedOn'>, keyof PracticeInput> {
  const errors: FieldErrors<keyof PracticeInput> = {};
  const name = requireText(input.name, LIMITS.name, 'A practice');
  if (name.error) errors.name = name.value ? name.error : 'A practice needs a few words.';
  const why = cleanText(input.why);
  if (why.length > LIMITS.why) errors.why = `Keep it under ${LIMITS.why} characters.`;
  const c = input.cadence;
  if (c.kind === 'times' && !(Number.isInteger(c.n) && c.n >= 1 && c.n <= 6)) errors.cadence = 'Choose between 1 and 6 times a week.';
  if (c.kind === 'weekly' && !(Number.isInteger(c.weekday) && c.weekday >= 0 && c.weekday <= 6)) errors.cadence = 'Choose a day.';
  if (!isValidISO(input.startedOn)) errors.startedOn = 'Enter a valid date.';
  else if (input.startedOn > addDays(today, 365)) errors.startedOn = 'Start within the next year.';
  return finish(errors, () => ({ name: name.value, why, cadence: c, startedOn: input.startedOn }));
}

export function cadenceLabel(c: Cadence): string {
  if (c.kind === 'daily') return 'Every day';
  if (c.kind === 'times') return c.n === 1 ? 'Once a week' : `${c.n} times a week`;
  return `${WEEKDAYS[c.weekday]}s`;
}
