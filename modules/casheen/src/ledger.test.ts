import { DEFAULT_CATEGORIES, addMonths, budgetFor, budgetRows, budgetTotal, byDay, categoriesOf, entriesIn, isMonthKey, ledgerStats, monthKey, monthLabel, totals, validateCategoryName, validateEntry, type Entry } from './ledger';

const e = (id: string, kind: Entry['kind'], amount: number, categoryId: string, date: string, createdAt = `${date}T10:00:00Z`): Entry => ({ id, kind, amount, categoryId, date, note: '', createdAt });
const log = [
  e('a', 'out', 25000, 'food', '2026-11-20'),
  e('b', 'out', 32500, 'transport', '2026-11-20', '2026-11-20T12:00:00Z'),
  e('c', 'in', 8000000, 'salary', '2026-11-01'),
  e('d', 'out', 450000, 'bills', '2026-11-02'),
  e('x', 'out', 99000, 'food', '2026-10-30'),
];

describe('ledger', () => {
  it('counts months', () => {
    expect(monthKey('2026-11-23')).toBe('2026-11');
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
  });

  it('adds up a month and lays it out by day', () => {
    const nov = entriesIn(log, '2026-11');
    expect(totals(nov)).toEqual({ in: 8000000, out: 507500, net: 7492500, count: 4 });
    const days = byDay(nov);
    expect(days.map((d) => d.date)).toEqual(['2026-11-20', '2026-11-02', '2026-11-01']);
    expect(days[0]!.entries.map((x) => x.id)).toEqual(['b', 'a']);
    expect(days[0]!.out).toBe(57500);
  });

  it('shows what is left of each limit, and going over plainly', () => {
    const budget = { id: '2026-11', limits: { food: 20000, bills: 500000 } };
    const rows = budgetRows(log, budget, [], '2026-11');
    const food = rows.find((r) => r.category.id === 'food')!;
    expect(food).toMatchObject({ limit: 20000, spent: 25000, left: -5000, over: true });
    expect(rows.find((r) => r.category.id === 'transport')).toMatchObject({ limit: null, spent: 32500, left: null, over: false });
    expect(rows.some((r) => r.category.kind === 'in')).toBe(false);
    expect(budgetTotal(rows)).toEqual({ limit: 520000, spent: 475000, left: 45000 });
  });

  it('starts a new month from the last budget', () => {
    const budgets = [{ id: '2026-09', limits: { food: 1 } }, { id: '2026-10', limits: { food: 2 } }];
    expect(budgetFor(budgets, '2026-12')).toEqual({ budget: { id: '2026-12', limits: { food: 2 } }, copiedFrom: '2026-10' });
    expect(budgetFor(budgets, '2026-10').copiedFrom).toBeNull();
    expect(budgetFor([], '2026-10')).toEqual({ budget: undefined, copiedFrom: null });
  });

  it('starts with sensible categories, archived last', () => {
    expect(categoriesOf([]).map((c) => c.id)).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
    const mine = [{ id: 'z', name: 'Old', kind: 'out' as const, order: 0, archived: true }, { id: 'y', name: 'Kids', kind: 'out' as const, order: 5, archived: false }];
    expect(categoriesOf(mine).map((c) => c.id)).toEqual(['y', 'z']);
    expect(validateCategoryName('  ', [])).toMatch(/needs a name/);
    expect(validateCategoryName('food', DEFAULT_CATEGORIES)).toMatch(/already/);
    expect(validateCategoryName('Kids', DEFAULT_CATEGORIES)).toBeNull();
  });

  it('validates an entry', () => {
    const ok = validateEntry({ kind: 'out', amount: 25000, categoryId: 'food', date: '2026-11-20', note: '  kopi  ' }, []);
    expect(ok).toEqual({ ok: true, value: { kind: 'out', amount: 25000, categoryId: 'food', date: '2026-11-20', note: 'kopi' } });
    const bad = validateEntry({ kind: 'in', amount: null, categoryId: 'food', date: 'x', note: '' }, []);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['amount', 'categoryId', 'date']);
  });

  it('gives the Almanac counts, never amounts', () => {
    expect(ledgerStats(log, '2026')).toEqual({ entries: 5, months: 2 });
  });
});
