/** Date helpers. All calculations are in the user's local time zone; weeks run Monday–Sunday (ISO 8601). */

const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -offset);
}

/** Sunday 23:59:59.999 of the week containing `date`. */
export function endOfWeek(date: Date): Date {
  const end = addDays(startOfWeek(date), 7);
  return new Date(end.getTime() - 1);
}

/** Weekday index with Monday = 0 … Sunday = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** ISO week-numbering year and week, e.g. { year: 2026, week: 47 }. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKey(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

const WEEK_KEY = /^(\d{4})-W(\d{2})$/;

export function isWeekKey(value: string): boolean {
  const m = WEEK_KEY.exec(value);
  return m !== null && Number(m[2]) >= 1 && Number(m[2]) <= 53;
}

/** Monday of the given ISO week key. Returns null for malformed keys. */
export function weekKeyToDate(key: string): Date | null {
  const m = WEEK_KEY.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const monday = addDays(startOfWeek(jan4), (week - 1) * 7);
  return weekKey(monday) === key ? monday : null;
}

/** Whole calendar weeks between two dates' weeks (b − a). */
export function weeksBetween(a: Date, b: Date): number {
  const diff = startOfWeek(b).getTime() - startOfWeek(a).getTime();
  return Math.round(diff / (7 * DAY_MS));
}

const monthShort = new Intl.DateTimeFormat('en', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('en', { month: 'long' });
const weekdayLong = new Intl.DateTimeFormat('en', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('en', { weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

/** "Nov 16 – 22, 2026" or "Dec 29 – Jan 4, 2027". */
export function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const left = `${monthShort.format(start)} ${start.getDate()}`;
  const right = sameMonth ? `${end.getDate()}` : `${monthShort.format(end)} ${end.getDate()}`;
  return `${left} – ${right}, ${end.getFullYear()}`;
}

export function formatMonthYear(date: Date): string {
  return `${monthLong.format(date)} ${date.getFullYear()}`;
}

export function formatWeekday(date: Date): string {
  return weekdayLong.format(date);
}

export function formatWeekdayShort(date: Date): string {
  return weekdayShort.format(date);
}

export function formatTime(date: Date): string {
  return timeFmt.format(date);
}

export function formatDayMonth(date: Date): string {
  return `${monthShort.format(date)} ${date.getDate()}`;
}

/** Human countdown to the end of the current week, e.g. "3 days", "9 hours", "40 minutes". */
export function timeUntil(target: Date, now: Date): string {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return minutes <= 1 ? 'a minute' : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour' : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'a day' : `${days} days`;
}

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 4000) return String(n);
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rest = n;
  let out = '';
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

/**
 * Filing date for a piece written `daysAgo` days ago, constrained to the current week
 * (you can catch up on this issue, but not rewrite a printed one). Keeps the time of day.
 */
export function filingDate(now: Date, daysAgo: number): Date {
  const allowed = Math.min(Math.max(0, Math.floor(daysAgo)), weekdayIndex(now));
  return addDays(now, -allowed);
}

/** Days of the current week up to and including today, newest first: [today, yesterday, …, Monday]. */
export function daysSoFarThisWeek(now: Date): Date[] {
  return Array.from({ length: weekdayIndex(now) + 1 }, (_, i) => startOfDay(addDays(now, -i)));
}

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago". */
export function timeAgo(from: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
