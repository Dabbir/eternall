import { addYears, diffDays, parseISO, yearsMonthsBetween } from './time';
import type { ISODate } from './tones';

const MS_PER_DAY = 86_400_000;

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts });
const LONG = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const MEDIUM = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const DAY_MONTH = fmt({ day: 'numeric', month: 'long' });
const DAY = fmt({ day: 'numeric' });
const MONTH_YEAR = fmt({ month: 'long', year: 'numeric' });
const WEEKDAY = fmt({ weekday: 'long' });
const NUM = new Intl.NumberFormat('en-GB');
const COMPACT = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

const asDate = (iso: ISODate) => new Date(parseISO(iso) * MS_PER_DAY);

export const formatLong = (iso: ISODate) => LONG.format(asDate(iso));
export const formatMedium = (iso: ISODate) => MEDIUM.format(asDate(iso));
export const formatMonthYear = (iso: ISODate) => MONTH_YEAR.format(asDate(iso));
export const formatWeekday = (iso: ISODate) => WEEKDAY.format(asDate(iso));
export const formatNumber = (n: number) => NUM.format(Math.round(n));
export const formatCompact = (n: number) => COMPACT.format(n);

/** "3 – 9 March 2025", "28 March – 3 April 2025", "29 Dec 2024 – 4 Jan 2025". */
export function formatRange(start: ISODate, end: ISODate): string {
  const a = asDate(start);
  const b = asDate(end);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${MEDIUM.format(a)} – ${MEDIUM.format(b)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${DAY_MONTH.format(a)} – ${LONG.format(b)}`;
  return `${DAY.format(a)} – ${LONG.format(b)}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/** "4 years, 2 months", "7 months", "less than a month". */
export function formatDuration(from: ISODate, to: ISODate): string {
  const { years, months } = yearsMonthsBetween(from, to);
  const parts: string[] = [];
  if (years) parts.push(plural(years, 'year'));
  if (months) parts.push(plural(months, 'month'));
  return parts.length ? parts.join(', ') : 'less than a month';
}

/** Countdown phrasing from `from` until `to`, in calendar years and days. */
export function formatCountdown(from: ISODate, to: ISODate): string {
  const days = diffDays(from, to);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 60) return `in ${plural(days, 'day')}`;
  let years = 0;
  while (parseISO(addYears(from, years + 1)) <= parseISO(to)) years++;
  if (years === 0) return `in ${plural(Math.round(days / 30.44), 'month')}`;
  const rem = diffDays(addYears(from, years), to);
  return rem > 0 ? `in ${plural(years, 'year')}, ${plural(rem, 'day')}` : `in ${plural(years, 'year')}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
