import { addDays, cleanText, diffDays, finish, isValidISO, parseISO, requireText, type FieldErrors, type ISODate, type Validation } from '@eternall/core';

/**
 * REFRAIN's domain (docs/MODULES.md §6, docs/design/refrain.md): rituals are lines of a score,
 * a week is a bar of seven beats (Mon→Sun), a kept day is a note and a missed expected day a rest.
 * Rests are neutral: nothing here counts streaks or failures.
 */
export const RITUAL_PATH = 'refrain/ritual';
export const MARK_PATH = 'refrain/mark';
export const LIMITS = { name: 60, why: 400 } as const;

export type Cadence = { kind: 'daily' } | { kind: 'times'; n: number } | { kind: 'weekly'; weekday: number };
export const INSTRUMENTS = ['piano', 'marimba', 'strings', 'bell'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export interface Ritual {
  id: string;
  name: string;
  why: string;
  cadence: Cadence;
  instrument: Instrument;
  /** Index into PENTATONIC: any combination of rituals sounds consonant. */
  pitch: number;
  startedOn: ISODate;
  pausedOn: ISODate | null;
}

/** One kept day. The id is `${ritualId}_${date}` (vault ids allow no colons), so a day can only be kept once. */
export interface Mark {
  id: string;
  ritualId: string;
  date: ISODate;
}

/** C major pentatonic over two octaves (Hz). */
export const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0] as const;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const markId = (ritualId: string, date: ISODate) => `${ritualId}_${date}`;

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: ISODate) => (((parseISO(date) + 3) % 7) + 7) % 7;
/** The Monday that starts the bar containing `date`. */
export const barStart = (date: ISODate) => addDays(date, -weekdayOf(date));
export const barDays = (start: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDays(start, i));

/** The lowest pitch not yet used, so new rituals add a new note to the chord. */
export function nextPitch(rituals: readonly Pick<Ritual, 'pitch'>[]): number {
  const used = new Set(rituals.map((r) => r.pitch));
  for (let i = 0; i < PENTATONIC.length; i++) if (!used.has(i)) return i;
  return rituals.length % PENTATONIC.length;
}

export const isActiveOn = (r: Pick<Ritual, 'startedOn' | 'pausedOn'>, date: ISODate) => date >= r.startedOn && (r.pausedOn === null || date < r.pausedOn);

export type Beat = 'kept' | 'rest' | 'open' | 'free' | 'future' | 'off';

/**
 * How one beat of a ritual reads on the score:
 * kept (a note) · rest (an expected day that passed unkept, black) · open (a day of a "n times a week"
 * ritual still free to use, grey) · free (not expected, grey) · future · off (before it began, or paused).
 */
export function beatOf(r: Ritual, date: ISODate, kept: ReadonlySet<string>, today: ISODate): Beat {
  if (kept.has(markId(r.id, date))) return 'kept';
  if (!isActiveOn(r, date)) return 'off';
  if (date > today) return 'future';
  if (r.cadence.kind === 'daily') return date === today ? 'open' : 'rest';
  if (r.cadence.kind === 'weekly') return weekdayOf(date) === r.cadence.weekday ? (date === today ? 'open' : 'rest') : 'free';
  return 'open';
}

/** How many notes the bar asks for, counting only days that have arrived (so the current bar is fair). */
export function expectedIn(r: Ritual, start: ISODate, today: ISODate): number {
  const days = barDays(start).filter((d) => d <= today && isActiveOn(r, d));
  if (r.cadence.kind === 'daily') return days.length;
  if (r.cadence.kind === 'weekly') return days.some((d) => weekdayOf(d) === (r.cadence as { weekday: number }).weekday) ? 1 : 0;
  // n per week: the full n once the bar is over; while it runs, never more than the days left allow.
  const end = addDays(start, 6);
  if (today >= end) return days.length ? Math.min(r.cadence.n, days.length) : 0;
  return 0;
}

export function keptIn(r: Ritual, start: ISODate, kept: ReadonlySet<string>): number {
  return barDays(start).filter((d) => kept.has(markId(r.id, d))).length;
}

/** A ritual is kept in a bar when it has as many notes as the bar asked for (and was active). */
export function isKeptIn(r: Ritual, start: ISODate, kept: ReadonlySet<string>, today: ISODate): boolean {
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
export function barSummary(rituals: readonly Ritual[], marks: readonly Mark[], start: ISODate, today: ISODate): BarSummary {
  const kept = keySet(marks);
  // Only rituals the bar has asked something of so far (or that already have a note) are counted,
  // so Saturday's call doesn't read as "not kept" on a Monday.
  const active = rituals.filter((r) => barDays(start).some((d) => d <= today && isActiveOn(r, d)) && (expectedIn(r, start, today) > 0 || keptIn(r, start, kept) > 0));
  return {
    active: active.length,
    kept: active.filter((r) => isKeptIn(r, start, kept, today)).length,
    notes: marks.filter((m) => m.date >= start && m.date <= addDays(start, 6)).length,
  };
}

export const keySet = (marks: readonly Mark[]) => new Set(marks.map((m) => m.id));

/** The rituals expected today (for the spine's "Mark today" sheet). */
export function dueToday(rituals: readonly Ritual[], today: ISODate): Ritual[] {
  return rituals.filter((r) => isActiveOn(r, today) && (r.cadence.kind !== 'weekly' || r.cadence.weekday === weekdayOf(today)));
}

export interface ScoreNote {
  beat: number;
  bar: number;
  pitch: number;
  instrument: Instrument;
  ritualId: string;
}

/** The notes to play for consecutive bars starting at `start` (one note per kept day). */
export function scoreNotes(rituals: readonly Ritual[], marks: readonly Mark[], start: ISODate, bars = 1): ScoreNote[] {
  const byId = new Map(rituals.map((r) => [r.id, r]));
  const end = addDays(start, bars * 7 - 1);
  const notes: ScoreNote[] = [];
  for (const m of marks) {
    const r = byId.get(m.ritualId);
    if (!r || m.date < start || m.date > end) continue;
    const offset = diffDays(start, m.date);
    notes.push({ bar: Math.floor(offset / 7), beat: offset % 7, pitch: r.pitch, instrument: r.instrument, ritualId: r.id });
  }
  return notes.sort((a, b) => a.bar - b.bar || a.beat - b.beat || a.pitch - b.pitch);
}

/** A whole year reduced to one line: notes per bar for each of the 52 bars ending with today's. */
export function yearLine(r: Ritual, marks: readonly Mark[], today: ISODate): number[] {
  const kept = keySet(marks.filter((m) => m.ritualId === r.id));
  const last = barStart(today);
  return Array.from({ length: 52 }, (_, i) => keptIn(r, addDays(last, (i - 51) * 7), kept));
}

export interface RitualStats {
  totalMarks: number;
  mostConstant: { ritual: Ritual; ratio: number } | null;
  keptThisYear: number;
}

/** For ALMANACK: totals, the ritual kept in the largest share of its bars, notes this year. */
export function ritualStats(rituals: readonly Ritual[], marks: readonly Mark[], today: ISODate): RitualStats {
  const kept = keySet(marks);
  let best: RitualStats['mostConstant'] = null;
  for (const r of rituals) {
    let bars = 0;
    let ok = 0;
    for (let s = barStart(r.startedOn); s <= today; s = addDays(s, 7)) {
      if (s > addDays(today, -7 * 52)) {
        bars++;
        if (isKeptIn(r, s, kept, today)) ok++;
      }
    }
    if (bars >= 2 && (!best || ok / bars > best.ratio)) best = { ritual: r, ratio: ok / bars };
  }
  const year = today.slice(0, 4);
  return { totalMarks: marks.length, mostConstant: best, keptThisYear: marks.filter((m) => m.date.startsWith(year)).length };
}

export interface RitualInput {
  name: string;
  why: string;
  cadence: Cadence;
  instrument: string;
  startedOn: string;
}

export function validateRitual(input: RitualInput, today: ISODate): Validation<Omit<Ritual, 'id' | 'pitch' | 'pausedOn'>, keyof RitualInput> {
  const errors: FieldErrors<keyof RitualInput> = {};
  const name = requireText(input.name, LIMITS.name, 'A ritual');
  if (name.error) errors.name = name.value ? name.error : 'A ritual needs a few words.';
  const why = cleanText(input.why);
  if (why.length > LIMITS.why) errors.why = `Keep it under ${LIMITS.why} characters.`;
  const c = input.cadence;
  if (c.kind === 'times' && !(Number.isInteger(c.n) && c.n >= 1 && c.n <= 6)) errors.cadence = 'Choose between 1 and 6 times a week.';
  if (c.kind === 'weekly' && !(Number.isInteger(c.weekday) && c.weekday >= 0 && c.weekday <= 6)) errors.cadence = 'Choose a day.';
  if (!(INSTRUMENTS as readonly string[]).includes(input.instrument)) errors.instrument = 'Choose a sound.';
  if (!isValidISO(input.startedOn)) errors.startedOn = 'Enter a valid date.';
  else if (input.startedOn > addDays(today, 365)) errors.startedOn = 'Start within the next year.';
  return finish(errors, () => ({ name: name.value, why, cadence: c, instrument: input.instrument as Instrument, startedOn: input.startedOn }));
}

export function cadenceLabel(c: Cadence): string {
  if (c.kind === 'daily') return 'Every day';
  if (c.kind === 'times') return c.n === 1 ? 'Once a week' : `${c.n} times a week`;
  return `${WEEKDAYS[c.weekday]}s`;
}
