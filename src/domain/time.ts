import type { ISODate } from './types';

/**
 * Calendar arithmetic on "day numbers" (days since 1970-01-01, UTC).
 * Working in whole days in UTC sidesteps daylight-saving and time-zone drift entirely.
 */

export const WEEKS_PER_ROW = 52;
const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISO(value: string): number {
  const m = ISO_RE.exec(value);
  if (!m) return Number.NaN;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  // Reject rollovers like 2023-02-31.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return Number.NaN;
  }
  return Math.floor(ms / MS_PER_DAY);
}

export function isValidISO(value: unknown): value is ISODate {
  return typeof value === 'string' && !Number.isNaN(parseISO(value));
}

export function toISO(day: number): ISODate {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Today's civil date in the user's local time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return toISO(parseISO(iso) + days);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return parseISO(to) - parseISO(from);
}

function dayOf(y: number, monthIndex: number, d: number): number {
  return Math.floor(Date.UTC(y, monthIndex, d) / MS_PER_DAY);
}

/** Day number of the birthday at the given age. Feb 29 birthdays fall on Feb 28 in common years. */
export function birthdayAt(birthISO: ISODate, age: number): number {
  const birth = new Date(parseISO(birthISO) * MS_PER_DAY);
  const y = birth.getUTCFullYear() + age;
  const mo = birth.getUTCMonth();
  let d = birth.getUTCDate();
  if (mo === 1 && d === 29 && !isLeapYear(y)) d = 28;
  return dayOf(y, mo, d);
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Add calendar years to a date, clamping Feb 29 to Feb 28. */
export function addYears(iso: ISODate, years: number): ISODate {
  return toISO(birthdayAt(iso, years));
}

export interface WeekCoord {
  /** Age in whole years: the row of the lifeline. */
  age: number;
  /** Week within that year of life, 0–51: the column. Week 51 absorbs the 1–2 leftover days. */
  week: number;
}

export const weekIndex = (c: WeekCoord): number => c.age * WEEKS_PER_ROW + c.week;
export const coordOf = (index: number): WeekCoord => ({
  age: Math.floor(index / WEEKS_PER_ROW),
  week: index % WEEKS_PER_ROW,
});

/** Locate the lifeline week containing `dateISO`, or `null` if it is before birth. */
export function locate(birthISO: ISODate, dateISO: ISODate): WeekCoord | null {
  const birth = parseISO(birthISO);
  const day = parseISO(dateISO);
  if (Number.isNaN(birth) || Number.isNaN(day) || day < birth) return null;
  let age = Math.floor((day - birth) / 365.2425);
  // The estimate may be off by one around birthdays; correct it.
  while (age > 0 && birthdayAt(birthISO, age) > day) age--;
  while (birthdayAt(birthISO, age + 1) <= day) age++;
  const week = Math.min(WEEKS_PER_ROW - 1, Math.floor((day - birthdayAt(birthISO, age)) / 7));
  return { age, week };
}

export function locateIndex(birthISO: ISODate, dateISO: ISODate): number | null {
  const c = locate(birthISO, dateISO);
  return c ? weekIndex(c) : null;
}

/** Inclusive first and last day of a lifeline week. */
export function weekRange(birthISO: ISODate, c: WeekCoord): { start: ISODate; end: ISODate } {
  const yearStart = birthdayAt(birthISO, c.age);
  const start = yearStart + c.week * 7;
  const end = c.week === WEEKS_PER_ROW - 1 ? birthdayAt(birthISO, c.age + 1) - 1 : start + 6;
  return { start: toISO(start), end: toISO(end) };
}

/** Last day covered by the lifeline. */
export function horizonEnd(birthISO: ISODate, horizonYears: number): ISODate {
  return toISO(birthdayAt(birthISO, horizonYears) - 1);
}

export function isWithin(iso: ISODate, start: ISODate, end: ISODate): boolean {
  const d = parseISO(iso);
  return d >= parseISO(start) && d <= parseISO(end);
}

/** Whole years and remaining months between two dates, for human-friendly durations. */
export function yearsMonthsBetween(from: ISODate, to: ISODate): { years: number; months: number } {
  const a = new Date(parseISO(from) * MS_PER_DAY);
  const b = new Date(parseISO(to) * MS_PER_DAY);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months--;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}
