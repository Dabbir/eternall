import { cleanText, finish, isValidISO, type FieldErrors, type ISODate, type Validation } from '@eternall/core';
import { MAX_AMOUNT } from './money';

/**
 * CASHEEN's domain (docs/design/casheen.md, docs/MODULES.md §10): money in and out, written down
 * plainly, and a monthly budget per category. Rupiah only, whole numbers. No scores, no streaks:
 * what's left is shown as it is, and going over is said in plain words.
 */
export const ENTRY_PATH = 'ledger/entry';
export const CATEGORY_PATH = 'ledger/category';
export const BUDGET_PATH = 'ledger/budget';
/** Words you taught it ("kopi" → Food), learned on this device, encrypted like everything else. */
export const WORDS_PATH = 'ledger/words';
export const PREF_PATH = 'ledger/pref';
export const LIMITS = { note: 140, categoryName: 30, categories: 40 } as const;

export type Kind = 'out' | 'in';

export interface Entry {
  id: string;
  kind: Kind;
  /** Whole rupiah, always positive; `kind` says which way it went. */
  amount: number;
  categoryId: string;
  date: ISODate;
  note: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  kind: Kind;
  order: number;
  archived: boolean;
}

/** One per month, keyed "YYYY-MM": the limit for each spending category (missing = no limit). */
export interface Budget {
  id: string;
  limits: Record<string, number>;
}

export interface LedgerPref {
  id: 'pref';
  /** A gentle reminder on the 1st to set the month's budget (off by default). */
  remindBudget: boolean;
}
export const DEFAULT_PREF: LedgerPref = { id: 'pref', remindBudget: false };

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'food', name: 'Food', kind: 'out', order: 0, archived: false },
  { id: 'transport', name: 'Transport', kind: 'out', order: 1, archived: false },
  { id: 'shopping', name: 'Shopping', kind: 'out', order: 2, archived: false },
  { id: 'bills', name: 'Bills', kind: 'out', order: 3, archived: false },
  { id: 'fun', name: 'Fun', kind: 'out', order: 4, archived: false },
  { id: 'health', name: 'Health', kind: 'out', order: 5, archived: false },
  { id: 'other-out', name: 'Other', kind: 'out', order: 6, archived: false },
  { id: 'salary', name: 'Salary', kind: 'in', order: 7, archived: false },
  { id: 'other-in', name: 'Other income', kind: 'in', order: 8, archived: false },
];
/** Where an entry lands when nothing better is known. */
export const FALLBACK: Record<Kind, string> = { out: 'other-out', in: 'other-in' };

/** Your categories, or the starting set before you have changed any. Sorted, archived last. */
export function categoriesOf(stored: readonly Category[]): Category[] {
  const list = stored.length ? [...stored] : [...DEFAULT_CATEGORIES];
  return list.sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order || a.name.localeCompare(b.name));
}

/* ---------- months ---------- */

export const monthKey = (date: ISODate) => date.slice(0, 7);

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export const isMonthKey = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/u.test(v);

export const entriesIn = (entries: readonly Entry[], key: string) => entries.filter((e) => monthKey(e.date) === key);

export interface Totals {
  in: number;
  out: number;
  /** in − out */
  net: number;
  count: number;
}

export function totals(entries: readonly Entry[]): Totals {
  let i = 0;
  let o = 0;
  for (const e of entries) {
    if (e.kind === 'in') i += e.amount;
    else o += e.amount;
  }
  return { in: i, out: o, net: i - o, count: entries.length };
}

export interface Day {
  date: ISODate;
  entries: Entry[];
  in: number;
  out: number;
}

/** The page of a month: days newest first, entries in each day newest first. */
export function byDay(entries: readonly Entry[]): Day[] {
  const days = new Map<ISODate, Entry[]>();
  for (const e of entries) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => {
      const t = totals(list);
      return { date, entries: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), in: t.in, out: t.out };
    });
}

/* ---------- budget ---------- */

export interface BudgetRow {
  category: Category;
  limit: number | null;
  spent: number;
  /** limit − spent; negative when over. Null without a limit. */
  left: number | null;
  over: boolean;
}

/** Spending categories with their limit and what went out this month, in category order. */
export function budgetRows(entries: readonly Entry[], budget: Budget | undefined, categories: readonly Category[], key: string): BudgetRow[] {
  const spent = new Map<string, number>();
  for (const e of entriesIn(entries, key)) if (e.kind === 'out') spent.set(e.categoryId, (spent.get(e.categoryId) ?? 0) + e.amount);
  return categoriesOf(categories)
    .filter((c) => c.kind === 'out' && (!c.archived || spent.has(c.id) || budget?.limits[c.id]))
    .map((c) => {
      const limit = budget?.limits[c.id] ?? null;
      const s = spent.get(c.id) ?? 0;
      const left = limit === null ? null : limit - s;
      return { category: c, limit, spent: s, left, over: left !== null && left < 0 };
    });
}

export function budgetTotal(rows: readonly BudgetRow[]): { limit: number; spent: number; left: number } {
  const limited = rows.filter((r) => r.limit !== null);
  const limit = limited.reduce((s, r) => s + r.limit!, 0);
  const spent = limited.reduce((s, r) => s + r.spent, 0);
  return { limit, spent, left: limit - spent };
}

/** A new month starts from the last month that had a budget. */
export function budgetFor(budgets: readonly Budget[], key: string): { budget: Budget | undefined; copiedFrom: string | null } {
  const own = budgets.find((b) => b.id === key);
  if (own) return { budget: own, copiedFrom: null };
  const earlier = budgets.filter((b) => b.id < key && Object.keys(b.limits).length).sort((a, b) => b.id.localeCompare(a.id))[0];
  return earlier ? { budget: { id: key, limits: { ...earlier.limits } }, copiedFrom: earlier.id } : { budget: undefined, copiedFrom: null };
}

/* ---------- validation ---------- */

export interface EntryInput {
  kind: string;
  amount: number | null;
  categoryId: string;
  date: string;
  note: string;
}

export function validateEntry(input: EntryInput, categories: readonly Category[]): Validation<Omit<Entry, 'id' | 'createdAt'>, keyof EntryInput> {
  const errors: FieldErrors<keyof EntryInput> = {};
  if (input.kind !== 'out' && input.kind !== 'in') errors.kind = 'Choose money out or money in.';
  if (input.amount === null || !Number.isInteger(input.amount) || input.amount <= 0) errors.amount = 'Write an amount, like 25rb or 25.000.';
  else if (input.amount > MAX_AMOUNT) errors.amount = 'That amount is too large.';
  const cat = categoriesOf(categories).find((c) => c.id === input.categoryId);
  if (!cat) errors.categoryId = 'Choose a category.';
  else if (cat.kind !== input.kind) errors.categoryId = input.kind === 'in' ? 'Choose an income category.' : 'Choose a spending category.';
  if (!isValidISO(input.date)) errors.date = 'Choose a date.';
  const note = cleanText(input.note);
  if (note.length > LIMITS.note) errors.note = `Keep the note under ${LIMITS.note} characters.`;
  return finish(errors, () => ({ kind: input.kind as Kind, amount: input.amount!, categoryId: input.categoryId, date: input.date, note }));
}

export function validateCategoryName(name: string, others: readonly Category[]): string | null {
  const n = cleanText(name);
  if (!n) return 'A category needs a name.';
  if (n.length > LIMITS.categoryName) return `Keep it under ${LIMITS.categoryName} characters.`;
  if (others.some((c) => c.name.toLocaleLowerCase() === n.toLocaleLowerCase())) return 'There is already a category with that name.';
  return null;
}

/** For the house Almanac: counts only, never amounts (amounts never leave CASHEEN). */
export function ledgerStats(entries: readonly Entry[], year: string) {
  const mine = entries.filter((e) => e.date.startsWith(year));
  return { entries: mine.length, months: new Set(mine.map((e) => monthKey(e.date))).size };
}
