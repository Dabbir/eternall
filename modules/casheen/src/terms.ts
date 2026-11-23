import { DAY_WORDS, INCOME, UNITS, WEEKDAYS } from './quick';
import { MAX_AMOUNT } from './money';

/**
 * Your own shorthand for the quick line (docs/design/casheen.md §Shorthand; ADR 0012): the words you
 * really type. Built-in words keep working; yours are added on top, never replace them, and can't
 * collide with a built-in word that means something else. Kept in the vault as `ledger/terms`.
 *
 *   units   "rebu" → × 1.000, "jeti" → × 1.000.000          ("25rebu", "2 jeti")
 *   fixed   "goceng" → Rp 5.000, "ceban" → Rp 10.000          ("parkir goceng", "2 ceban")
 *   days    "semalem" → yesterday, "tadi" → today, "sen" → Monday
 *   income  "cair", "dapet", "transferan" → money in
 */
export const TERMS_PATH = 'ledger/terms';
export const LIMITS = { word: 20, perKind: 40 } as const;

export interface UnitTerm {
  word: string;
  mult: 1000 | 1000000;
}
export interface FixedTerm {
  word: string;
  amount: number;
}
export interface DayTerm {
  word: string;
  /** 0 = today, 1 = yesterday, … (up to 6). */
  daysAgo?: number | undefined;
  /** 0 = Sunday … 6 = Saturday: the most recent such day. */
  weekday?: number | undefined;
}
export interface Terms {
  id: 'terms';
  units: UnitTerm[];
  fixed: FixedTerm[];
  days: DayTerm[];
  income: string[];
}
export const EMPTY_TERMS: Terms = { id: 'terms', units: [], fixed: [], days: [], income: [] };

export type TermKind = 'unit' | 'fixed' | 'day' | 'income';
export const KIND_LABEL: Record<TermKind, string> = { unit: 'an amount word', fixed: 'a fixed amount', day: 'a day', income: 'a money-in word' };

export const normalizeWord = (w: string) => w.trim().toLocaleLowerCase('id');

/** Which kind a word already means, built in or yours, or null. */
export function meaningOf(word: string, terms: Terms): TermKind | null {
  const w = normalizeWord(word);
  if (UNITS.has(w) || terms.units.some((u) => u.word === w)) return 'unit';
  if (terms.fixed.some((f) => f.word === w)) return 'fixed';
  if (DAY_WORDS.has(w) || w in WEEKDAYS || terms.days.some((d) => d.word === w)) return 'day';
  if (INCOME.has(w) || terms.income.includes(w)) return 'income';
  return null;
}

const isBuiltIn = (w: string) => UNITS.has(w) || DAY_WORDS.has(w) || w in WEEKDAYS || INCOME.has(w);

/** Null when the word can be added as `kind`; otherwise a plain reason. */
export function validateWord(raw: string, kind: TermKind, terms: Terms): string | null {
  const w = normalizeWord(raw);
  if (!w) return 'Write a word.';
  if (w.length > LIMITS.word) return `Keep it under ${LIMITS.word} letters.`;
  if (!/^[\p{L}][\p{L}'-]*$/u.test(w)) return 'Use letters only, as one word.';
  const means = meaningOf(w, terms);
  if (means && isBuiltIn(w)) return means === kind ? `“${w}” is already understood.` : `“${w}” already means ${KIND_LABEL[means]}.`;
  if (means && means !== kind) return `“${w}” already means ${KIND_LABEL[means]} in your shorthand.`;
  const count = kind === 'unit' ? terms.units.length : kind === 'fixed' ? terms.fixed.length : kind === 'day' ? terms.days.length : terms.income.length;
  if (count >= LIMITS.perKind && !means) return `Keep at most ${LIMITS.perKind} of these.`;
  return null;
}

export function validateFixedAmount(amount: number | null): string | null {
  if (amount === null || !Number.isInteger(amount) || amount <= 0) return 'Write the amount it stands for, like 5rb or 5.000.';
  if (amount > MAX_AMOUNT) return 'That amount is too large.';
  return null;
}

/** Adds or replaces a word (a word lives in one list only). */
export function addTerm(terms: Terms, t: { kind: 'unit'; word: string; mult: 1000 | 1000000 } | { kind: 'fixed'; word: string; amount: number } | { kind: 'day'; word: string; daysAgo?: number; weekday?: number } | { kind: 'income'; word: string }): Terms {
  const w = normalizeWord(t.word);
  const next = removeTerm(terms, w);
  if (t.kind === 'unit') return { ...next, units: [...next.units, { word: w, mult: t.mult }] };
  if (t.kind === 'fixed') return { ...next, fixed: [...next.fixed, { word: w, amount: t.amount }] };
  if (t.kind === 'day') return { ...next, days: [...next.days, t.weekday !== undefined ? { word: w, weekday: t.weekday } : { word: w, daysAgo: Math.min(6, Math.max(0, t.daysAgo ?? 0)) }] };
  return { ...next, income: [...next.income, w] };
}

export function removeTerm(terms: Terms, word: string): Terms {
  const w = normalizeWord(word);
  return { ...terms, units: terms.units.filter((u) => u.word !== w), fixed: terms.fixed.filter((f) => f.word !== w), days: terms.days.filter((d) => d.word !== w), income: terms.income.filter((i) => i !== w) };
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_CHOICES: { value: string; label: string; term: Pick<DayTerm, 'daysAgo' | 'weekday'> }[] = [
  { value: 'ago-0', label: 'today', term: { daysAgo: 0 } },
  { value: 'ago-1', label: 'yesterday', term: { daysAgo: 1 } },
  { value: 'ago-2', label: 'two days ago', term: { daysAgo: 2 } },
  ...WEEKDAY_NAMES.map((n, i) => ({ value: `wd-${i}`, label: `last ${n}`, term: { weekday: i } })),
];
export function dayLabel(d: Pick<DayTerm, 'daysAgo' | 'weekday'>): string {
  if (d.weekday !== undefined) return `last ${WEEKDAY_NAMES[d.weekday]}`;
  return DAY_CHOICES.find((c) => c.term.daysAgo === d.daysAgo)?.label ?? `${d.daysAgo} days ago`;
}

/** What it already understands, to show beside your own words. */
export const BUILT_IN = {
  units: [...UNITS],
  days: ['hari ini', 'today', 'kemarin', 'kmrn', 'yesterday', 'kemarin lusa', '3 hari lalu', 'senin … minggu', '1/11'],
  income: [...INCOME],
};
