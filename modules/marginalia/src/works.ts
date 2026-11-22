import { addDays, cleanText, finish, isValidISO, requireText, todayISO, type FieldErrors, type ISODate, type Validation } from '@eternall/core';

/**
 * MARGINALIA's domain (docs/MODULES.md §9, docs/design/marginalia.md): works you take in, and the
 * passages you underline with notes in the margin. Everything is typed by you (no lookups), and
 * only passages are kept, never whole texts.
 */
export const WORK_PATH = 'marginalia/work';
export const UNDERLINE_PATH = 'marginalia/underline';
export const PREF_PATH = 'marginalia/pref';
/** Reading preferences (one record). Handwritten margins are off by default and only ever used for short notes. */
export interface Prefs {
  id: 'main';
  hand: boolean;
}
export const LIMITS = { title: 160, by: 120, word: 24, text: 2000, locator: 40, note: 1000 } as const;
export const KINDS = ['book', 'film', 'album', 'essay', 'podcast', 'other'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { book: 'Book', film: 'Film', album: 'Album', essay: 'Essay', podcast: 'Podcast', other: 'Other' };

export type Landing = { stars: number } | { word: string } | null;

export interface Work {
  id: string;
  title: string;
  by: string;
  kind: Kind;
  started: ISODate | null;
  finished: ISODate | null;
  landing: Landing;
  createdAt: string;
}

export interface Underline {
  id: string;
  workId: string;
  text: string;
  locator: string;
  note: string;
  /** Opt-in: AMAZEEN may show it on its "Overheard" page (quotes.offer). */
  offered: boolean;
  createdAt: string;
}

/** The civil date (local time) an underline was made: its `createdAt` is a UTC timestamp. */
export const dayOf = (iso: string): ISODate => todayISO(new Date(iso));

const ARTICLE = /^(the|a|an)\s+/iu;
export const titleKey = (t: string) => t.replace(ARTICLE, '').toLocaleLowerCase();
const PARTICLES = new Set(['le', 'la', 'de', 'du', 'des', 'di', 'da', 'del', 'della', 'van', 'von', 'der', 'den', 'ter', 'ten', 'al', 'el', 'bin', 'ibn']);
/** Split a name into given names and the surname, keeping particles with it ("Ursula K. Le Guin" → Le Guin). */
function splitName(by: string): { given: string[]; surname: string } | null {
  const parts = by.trim().split(/\s+/u).filter(Boolean);
  if (parts.length < 2) return null;
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1]!.toLocaleLowerCase())) i--;
  return { given: parts.slice(0, i), surname: parts.slice(i).join(' ') };
}
/** "Virginia Woolf" → "woolf, virginia"; a single name stays as it is. */
export function authorKey(by: string): string {
  const n = splitName(by);
  return (n ? `${n.surname}, ${n.given.join(' ')}` : by.trim()).toLocaleLowerCase();
}
/** Catalogue heading: "Woolf, V.", "Le Guin, U. K." */
export function authorHeading(by: string): string {
  const n = splitName(by);
  return n ? `${n.surname}, ${n.given.map((p) => `${p[0]}.`).join(' ')}` : by.trim();
}

export type SortBy = 'author' | 'title' | 'year' | 'kind';
const RANGES = ['A–C', 'D–G', 'H–L', 'M–P', 'Q–S', 'T–Z'] as const;
const rangeOf = (key: string) => {
  const c = key.normalize('NFD').charAt(0).toUpperCase();
  if (c < 'A' || c > 'Z') return '#';
  return RANGES.find((r) => c >= r[0]! && c <= r[2]!) ?? '#';
};
export const yearOf = (w: Pick<Work, 'finished' | 'started'>) => (w.finished ?? w.started)?.slice(0, 4) ?? null;

export interface Drawer {
  label: string;
  works: Work[];
}

/** The catalogue cabinet: drawers by author or title range, by year read, or by kind. */
export function catalogue(works: readonly Work[], sort: SortBy): Drawer[] {
  const key = (w: Work) => (sort === 'author' ? authorKey(w.by || w.title) : titleKey(w.title));
  const drawerOf = (w: Work) => (sort === 'year' ? (yearOf(w) ?? 'Undated') : sort === 'kind' ? KIND_LABEL[w.kind] : rangeOf(key(w)));
  const groups = new Map<string, Work[]>();
  for (const w of works) groups.set(drawerOf(w), [...(groups.get(drawerOf(w)) ?? []), w]);
  const order = (a: string, b: string) => {
    if (sort === 'year') return a === 'Undated' ? 1 : b === 'Undated' ? -1 : b.localeCompare(a);
    if (sort === 'kind') return KINDS.findIndex((k) => KIND_LABEL[k] === a) - KINDS.findIndex((k) => KIND_LABEL[k] === b);
    return a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b);
  };
  return [...groups.entries()].sort((a, b) => order(a[0], b[0])).map(([label, ws]) => ({ label, works: ws.sort((a, b) => key(a).localeCompare(key(b))) }));
}

export const currentlyReading = (works: readonly Work[]) => works.filter((w) => w.started && !w.finished).sort((a, b) => b.started!.localeCompare(a.started!));
export const underlinesOf = (all: readonly Underline[], workId: string) => all.filter((u) => u.workId === workId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export function landingLabel(l: Landing): string {
  if (!l) return '';
  return 'stars' in l ? '★'.repeat(l.stars) + '☆'.repeat(5 - l.stars) : `“${l.word}”`;
}

export interface WorkInput {
  title: string;
  by: string;
  kind: string;
  started: string;
  finished: string;
  landing: Landing;
}

export function validateWork(input: WorkInput, today: ISODate): Validation<Omit<Work, 'id' | 'createdAt'>, keyof WorkInput> {
  const errors: FieldErrors<keyof WorkInput> = {};
  const title = requireText(input.title, LIMITS.title, 'A title');
  if (title.error) errors.title = title.value ? title.error : 'A work needs a title.';
  const by = cleanText(input.by);
  if (by.length > LIMITS.by) errors.by = `Keep it under ${LIMITS.by} characters.`;
  if (!(KINDS as readonly string[]).includes(input.kind)) errors.kind = 'Choose a kind.';
  const started = input.started || null;
  const finished = input.finished || null;
  if (started && !isValidISO(started)) errors.started = 'Enter a valid date.';
  if (finished && !isValidISO(finished)) errors.finished = 'Enter a valid date.';
  else if (finished && finished > addDays(today, 1)) errors.finished = 'You can’t have finished it yet.';
  else if (started && finished && finished < started) errors.finished = 'It ends after it starts.';
  let landing: Landing = null;
  if (input.landing && 'stars' in input.landing) {
    if (!Number.isInteger(input.landing.stars) || input.landing.stars < 1 || input.landing.stars > 5) errors.landing = 'Choose one to five stars.';
    else landing = { stars: input.landing.stars };
  } else if (input.landing && 'word' in input.landing) {
    const word = cleanText(input.landing.word);
    if (word.length > LIMITS.word || /\s/u.test(word)) errors.landing = 'One word, please.';
    else if (word) landing = { word };
  }
  return finish(errors, () => ({ title: title.value, by, kind: input.kind as Kind, started, finished, landing }));
}

export interface UnderlineInput {
  text: string;
  locator: string;
  note: string;
  offered: boolean;
}

export function validateUnderline(input: UnderlineInput): Validation<Omit<Underline, 'id' | 'workId' | 'createdAt'>, keyof UnderlineInput> {
  const errors: FieldErrors<keyof UnderlineInput> = {};
  const text = requireText(input.text, LIMITS.text, 'A passage');
  if (text.error) errors.text = text.value ? 'Keep it to a passage, not a whole text (2,000 characters at most).' : 'Type or paste the line that stayed with you.';
  const locator = cleanText(input.locator);
  if (locator.length > LIMITS.locator) errors.locator = 'Keep it short, like “p. 112” or “01:14:03”.';
  const note = input.note.trim();
  if (note.length > LIMITS.note) errors.note = `Keep the note under ${LIMITS.note} characters.`;
  return finish(errors, () => ({ text: text.value, locator, note, offered: input.offered }));
}

/** For ALMANACK: finished this year by kind, the most-underlined work. */
export function marginaliaStats(works: readonly Work[], underlines: readonly Underline[], today: ISODate) {
  const year = today.slice(0, 4);
  const byKind = new Map<Kind, number>();
  for (const w of works) if (w.finished?.startsWith(year)) byKind.set(w.kind, (byKind.get(w.kind) ?? 0) + 1);
  const counts = new Map<string, number>();
  for (const u of underlines) counts.set(u.workId, (counts.get(u.workId) ?? 0) + 1);
  const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { finishedThisYear: [...byKind.values()].reduce((a, b) => a + b, 0), byKind, mostUnderlined: topId ? { work: works.find((w) => w.id === topId[0]) ?? null, count: topId[1] } : null };
}

/** Underlines made around this date in earlier years (±3 days), for echoes. */
export function echoes(underlines: readonly Underline[], today: ISODate): Underline[] {
  const year = Number(today.slice(0, 4));
  return underlines.filter((u) => {
    const d = dayOf(u.createdAt);
    const y = Number(d.slice(0, 4));
    if (y >= year) return false;
    const shifted = `${year}${d.slice(4)}`;
    return isValidISO(shifted) && shifted >= addDays(today, -3) && shifted <= addDays(today, 3);
  });
}

/** What MARGINALIA offers AMAZEEN's "Overheard" page: only underlines the person opted in. */
export function offeredQuotes(works: readonly Work[], underlines: readonly Underline[]) {
  const byId = new Map(works.map((w) => [w.id, w]));
  return underlines
    .filter((u) => u.offered && byId.has(u.workId))
    .map((u) => ({ id: u.id, text: u.text, by: byId.get(u.workId)!.by, workTitle: byId.get(u.workId)!.title }));
}
