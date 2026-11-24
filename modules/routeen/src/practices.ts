import { addDays, cleanText, finish, isValidISO, parseISO, requireText, type FieldErrors, type ISODate, type Validation } from '@eternall/core';

/**
 * ROUTEEN's domain (once REFRAIN): a practice is kept at one of three tiers (Minimum, Target, More),
 * optionally at a time of day and with a measure. Nothing here counts streaks or failures.
 * Records keep their `refrain/*` paths (docs/adr/0014).
 */
export const PRACTICE_PATH = 'refrain/ritual';
export const MARK_PATH = 'refrain/mark';
export const LIMITS = { name: 60, why: 400, unit: 20 } as const;

export type Cadence = { kind: 'daily' } | { kind: 'times'; n: number } | { kind: 'weekly'; weekday: number };

export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'anytime';
export interface Measure {
  unit: string;
  target: number;
  minimum: number;
}

export interface Practice {
  id: string;
  name: string;
  why: string;
  cadence: Cadence;
  /** Old practices have none: they read as any time. */
  timeOfDay?: TimeOfDay;
  measure?: Measure;
  startedOn: ISODate;
  pausedOn: ISODate | null;
}

/** One kept day. The id is `${ritualId}_${date}` (vault ids allow no colons), so a day can only be kept once. */
export type Tier = 'minimum' | 'target' | 'more';
export interface Mark {
  id: string;
  ritualId: string;
  date: ISODate;
  /** Marks from the loom era have none: they read as Target. */
  tier?: Tier;
}

export const tierOf = (m: Pick<Mark, 'tier'>): Tier => m.tier ?? 'target';
export const timeOf = (p: Pick<Practice, 'timeOfDay'>): TimeOfDay => p.timeOfDay ?? 'anytime';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const markId = (ritualId: string, date: ISODate) => `${ritualId}_${date}`;

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: ISODate) => (((parseISO(date) + 3) % 7) + 7) % 7;
/** The Monday that starts the bar containing `date`. */
export const barStart = (date: ISODate) => addDays(date, -weekdayOf(date));
export const barDays = (start: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export const isActiveOn = (r: Pick<Practice, 'startedOn' | 'pausedOn'>, date: ISODate) => date >= r.startedOn && (r.pausedOn === null || date < r.pausedOn);

export interface PracticeInput {
  name: string;
  why: string;
  cadence: Cadence;
  startedOn: string;
  timeOfDay: TimeOfDay;
  measure: Measure | null;
}

export function validatePractice(input: PracticeInput, today: ISODate): Validation<Omit<Practice, 'id' | 'pausedOn'>, keyof PracticeInput> {
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
  const m = input.measure;
  const unit = m ? cleanText(m.unit) : '';
  if (m) {
    if (unit.length < 1 || unit.length > LIMITS.unit) errors.measure = `Keep the unit under ${LIMITS.unit} characters.`;
    else if (!(Number.isFinite(m.target) && Number.isFinite(m.minimum) && m.minimum > 0 && m.minimum <= m.target)) errors.measure = 'The minimum must be above 0 and no more than the target.';
  }
  return finish(errors, () => ({
    name: name.value,
    why,
    cadence: c,
    startedOn: input.startedOn,
    timeOfDay: input.timeOfDay,
    ...(m ? { measure: { unit, target: m.target, minimum: m.minimum } } : {}),
  }));
}

export function cadenceLabel(c: Cadence): string {
  if (c.kind === 'daily') return 'Every day';
  if (c.kind === 'times') return c.n === 1 ? 'Once a week' : `${c.n} times a week`;
  return `${WEEKDAYS[c.weekday]}s`;
}
