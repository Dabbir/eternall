import { cleanText, diffDays, finish, formatMedium, isLeapYear, isValidISO, requireText, type FieldErrors, type ISODate, type Reminder, type Validation } from '@eternall/core';

/**
 * AMAZEEN · People (once KINDRED; docs/adr/0014, docs/design/amazeen.md §14): a card per person on
 * the newsroom wall, notes of when you saw them, and dates to remember. People never receive
 * anything and are never contacted. No scores, no "overdue": time since you last met is said plainly.
 * Records keep their `kindred/*` paths.
 */
export const PERSON_PATH = 'kindred/person';
export const SEEN_PATH = 'kindred/seen';
/** One photo per person, keyed by the person's id, kept apart so the card file stays light. */
export const PHOTO_PATH = 'kindred/photo';
export const PREF_PATH = 'kindred/pref';
export const LIMITS = { name: 60, drawer: 30, howWeMet: 200, note: 280, dateLabel: 40, dates: 8 } as const;
export const CLOSENESS = ['inner', 'close', 'around'] as const;
export type Closeness = (typeof CLOSENESS)[number];
export const CLOSENESS_LABEL: Record<Closeness, string> = { inner: 'Inner circle', close: 'Close', around: 'Around' };
export const RECENT_DAYS = 14;

export interface PersonDate {
  label: string;
  date: ISODate;
  yearly: boolean;
}

export interface Person {
  id: string;
  name: string;
  drawer: string;
  closeness: Closeness;
  howWeMet: string;
  dates: PersonDate[];
  createdAt: string;
}

export interface Seen {
  id: string;
  personId: string;
  date: ISODate;
  note: string;
}

/** One "seen" per person per day. */
export const seenId = (personId: string, date: ISODate) => `${personId}_${date}`;

export function lastSeen(seen: readonly Seen[], personId: string): ISODate | null {
  let last: ISODate | null = null;
  for (const s of seen) if (s.personId === personId && (!last || s.date > last)) last = s.date;
  return last;
}

/** The next time a date comes round (yearly dates roll over; Feb 29 falls on Feb 28 in common years). */
export function nextOccurrence(d: PersonDate, today: ISODate): ISODate | null {
  if (!d.yearly) return d.date >= today ? d.date : null;
  const md = d.date.slice(5);
  const at = (y: number) => (md === '02-29' && !isLeapYear(y) ? `${y}-02-28` : `${y}-${md}`);
  const y = Number(today.slice(0, 4));
  return at(y) >= today ? at(y) : at(y + 1);
}

export interface Upcoming {
  person: Person;
  label: string;
  date: ISODate;
  days: number;
  /** For yearly dates with a known first year: the age or anniversary being reached. */
  turns: number | null;
}

export function upcomingDates(people: readonly Person[], today: ISODate, within = 30): Upcoming[] {
  const out: Upcoming[] = [];
  for (const p of people) {
    for (const d of p.dates) {
      const next = nextOccurrence(d, today);
      if (!next) continue;
      const days = diffDays(today, next);
      if (days > within) continue;
      const turns = d.yearly ? Number(next.slice(0, 4)) - Number(d.date.slice(0, 4)) : null;
      out.push({ person: p, label: d.label, date: next, days, turns: turns && turns > 0 ? turns : null });
    }
  }
  return out.sort((a, b) => a.days - b.days || a.person.name.localeCompare(b.person.name));
}

export interface Drawer {
  label: string;
  auto: boolean;
  people: Person[];
}

/** The card file: an automatic "Recently seen" drawer first, then your drawers, A–Z. */
export function drawers(people: readonly Person[], seen: readonly Seen[], today: ISODate): Drawer[] {
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);
  const recent = people
    .map((p) => ({ p, last: lastSeen(seen, p.id) }))
    .filter((x) => x.last && diffDays(x.last, today) <= RECENT_DAYS)
    .sort((a, b) => b.last!.localeCompare(a.last!))
    .map((x) => x.p);
  const groups = new Map<string, Person[]>();
  for (const p of people) groups.set(p.drawer || 'Unfiled', [...(groups.get(p.drawer || 'Unfiled') ?? []), p]);
  const named = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, ps]) => ({ label, auto: false, people: ps.sort(byName) }));
  return recent.length ? [{ label: 'Recently seen', auto: true, people: recent }, ...named] : named;
}

/**
 * The pieces a person appears in (docs/design/amazeen.md §14): entries whose text names them, by
 * full name or first name as a whole word. Resolved at read time, so nothing is stored about the
 * link and a piece reads the same whoever is on the wall. Newest first.
 */
export function appearsIn<E extends { id: string; createdAt: string }>(person: Pick<Person, 'name'>, entries: readonly E[], textOf: (e: E) => string): E[] {
  const first = person.name.trim().split(/\s+/u)[0] ?? '';
  if (!first) return [];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{M}])(?:${esc(person.name.trim())}|${esc(first)})(?![\\p{L}\\p{M}])`, 'iu');
  return entries.filter((e) => re.test(textOf(e))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function searchPeople(people: readonly Person[], query: string): Person[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return people
    .filter((p) => p.name.toLocaleLowerCase().includes(q))
    .sort((a, b) => Number(!a.name.toLocaleLowerCase().startsWith(q)) - Number(!b.name.toLocaleLowerCase().startsWith(q)) || a.name.localeCompare(b.name));
}

export function sinceLabel(days: number | null): string {
  if (days === null) return 'not seen yet';
  if (days === 0) return 'seen today';
  if (days === 1) return 'seen yesterday';
  if (days < 14) return `seen ${days} days ago`;
  if (days < 60) return `seen ${Math.round(days / 7)} weeks ago`;
  if (days < 730) return `seen ${Math.round(days / 30.44)} months ago`;
  return `seen ${Math.floor(days / 365.25)} years ago`;
}

export interface PersonInput {
  name: string;
  drawer: string;
  closeness: string;
  howWeMet: string;
  dates: { label: string; date: string; yearly: boolean }[];
}

export function validatePerson(input: PersonInput): Validation<Omit<Person, 'id' | 'createdAt'>, keyof PersonInput> {
  const errors: FieldErrors<keyof PersonInput> = {};
  const name = requireText(input.name, LIMITS.name, 'A name');
  if (name.error) errors.name = name.value ? name.error : 'A card needs a name.';
  const drawer = cleanText(input.drawer);
  if (drawer.length > LIMITS.drawer) errors.drawer = `Keep the drawer name under ${LIMITS.drawer} characters.`;
  if (!(CLOSENESS as readonly string[]).includes(input.closeness)) errors.closeness = 'Choose how close.';
  const howWeMet = cleanText(input.howWeMet);
  if (howWeMet.length > LIMITS.howWeMet) errors.howWeMet = `Keep it under ${LIMITS.howWeMet} characters.`;
  const dates = input.dates.filter((d) => d.label.trim() || d.date);
  if (dates.length > LIMITS.dates) errors.dates = `Keep at most ${LIMITS.dates} dates.`;
  for (const d of dates) {
    if (!d.label.trim()) errors.dates = 'Each date needs a label, like “Birthday”.';
    else if (!isValidISO(d.date)) errors.dates = `Enter a valid date for “${d.label.trim()}”.`;
  }
  return finish(errors, () => ({
    name: name.value,
    drawer,
    closeness: input.closeness as Closeness,
    howWeMet,
    dates: dates.map((d) => ({ label: cleanText(d.label).slice(0, LIMITS.dateLabel), date: d.date, yearly: d.yearly })),
  }));
}

export function kindredStats(people: readonly Person[], seen: readonly Seen[], today: ISODate) {
  const year = today.slice(0, 4);
  return { kept: people.length, seenThisYear: new Set(seen.filter((s) => s.date.startsWith(year)).map((s) => s.personId)).size };
}

/* ---------- photos (optional, added by you, encrypted like everything else) ---------- */

export interface Photo {
  /** The person's id. */
  id: string;
  /** A small JPEG or WebP, as a data URL. */
  src: string;
}
/** Longest side, in pixels, after resizing on this device. */
export const PHOTO_EDGE = 360;
/** ≈150 KB of image: far under one sync record, enough for a card portrait. */
export const PHOTO_MAX_CHARS = 200_000;

/** Scale (w, h) to fit inside a square of `edge`, never enlarging. */
export function fitWithin(w: number, h: number, edge = PHOTO_EDGE): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const k = Math.min(1, edge / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

export function isPhotoSrc(src: unknown): src is string {
  return typeof src === 'string' && src.length <= PHOTO_MAX_CHARS && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+=*$/u.test(src);
}

/* ---------- local reminders (opt-in) ---------- */

export const REMIND = ['off', 'day', 'eve', 'week'] as const;
export type Remind = (typeof REMIND)[number];
export const REMIND_LABEL: Record<Remind, string> = { off: 'Off', day: 'On the day', eve: 'The day before', week: 'A week before' };
const LEAD: Record<Remind, number | null> = { off: null, day: 0, eve: 1, week: 7 };

export interface KindredPref {
  id: 'pref';
  remind: Remind;
}
export const DEFAULT_PREF: KindredPref = { id: 'pref', remind: 'off' };

const slug = (s: string) => s.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 24) || 'date';
const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

/** "Turning 68 on 2 Dec 2026." · "On 2 Dec 2026." · "Turning 68." · "" */
function reminderBody(turning: string, on: string | null): string {
  if (turning && on) return `${turning} on ${on}.`;
  if (turning) return `${turning}.`;
  return on ? `On ${on}.` : '';
}

/**
 * Reminders due today: on the day itself, and once more `lead` days before when chosen.
 * Each occasion has its own key, so the house delivers it once (across devices, through sync).
 */
export function dueReminders(people: readonly Person[], today: ISODate, remind: Remind): Reminder[] {
  const lead = LEAD[remind];
  if (lead === null) return [];
  return upcomingDates(people, today, lead)
    .filter((u) => u.days === 0 || u.days === lead)
    .map((u) => {
      const what = u.label.toLocaleLowerCase();
      const when = u.days === 0 ? 'is today' : u.days === 1 ? 'is tomorrow' : `is in ${u.days} days`;
      return {
        imprint: 'amazeen' as const,
        key: `kindred_${u.person.id}_${slug(u.label)}_${u.date}_${u.days}`,
        date: today,
        title: `${possessive(u.person.name)} ${what} ${when}`,
        body: reminderBody(what === 'birthday' && u.turns ? `Turning ${u.turns}` : u.turns ? `${u.turns} years` : '', u.days === 0 ? null : formatMedium(u.date)),
        href: `/amazeen/people/${u.person.id}`,
      };
    });
}
