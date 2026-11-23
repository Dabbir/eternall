import type { ImprintDefinition } from '@eternall/core';
import { BUDGET_PATH, CATEGORY_PATH, DEFAULT_PREF, ENTRY_PATH, PREF_PATH, WORDS_PATH, addMonths, monthKey, monthLabel, type Budget, type Entry, type LedgerPref } from './ledger';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[]; get(id: string): T | undefined } } };
const entries = (ctx: Readable) => ctx.data.collection<Entry>(ENTRY_PATH).all();

/**
 * CASHEEN (docs/design/casheen.md, ADR 0012, ADR 0013): money in and out, written in one line, and
 * a monthly budget. **Money stays in CASHEEN** (docs/PRODUCT.md, firm boundaries): it contributes
 * nothing to the house — no Almanac facts, lifeline marks, memories or capabilities. Its only
 * contribution is its own opt-in reminder, which names a month, never an amount.
 */
export const casheen: ImprintDefinition = {
  id: 'casheen',
  name: 'CASHEEN',
  label: 'Money',
  functionLine: 'Money, kept plainly',
  basePath: '/casheen/',
  release: 2,
  accent: { light: '#2f5d3a', dark: '#8fc79b' },
  intro: 'Write money down in one line, like a message to yourself: “kopi 25rb”, “gaji 8jt”, “grab 32.500 kemarin”. It learns your words as you go. The months sit under the title, like a ledger’s thumb index.',
  brand: { icon: '/icons/casheen.svg', themeColor: { light: '#eef1e4', dark: '#111611' }, lockTitle: 'The book is closed.', leaveLabel: 'Close the book' },
  load: () => import('./app/CasheenApp'),
  collections: [ENTRY_PATH, CATEGORY_PATH, BUDGET_PATH, WORDS_PATH, PREF_PATH],
  hasData: (ctx) => entries(ctx).length > 0,


  reminders(ctx) {
    const pref = ctx.data.collection<LedgerPref>(PREF_PATH).get('pref') ?? DEFAULT_PREF;
    if (!pref.remindBudget || ctx.today.slice(8) !== '01') return [];
    const key = monthKey(ctx.today);
    const has = ctx.data.collection<Budget>(BUDGET_PATH).get(key);
    if (has) return [];
    return [{ imprint: 'casheen', key: `ledger_budget_${key}`, date: ctx.today, title: `Set the budget for ${monthLabel(key)}`, body: `Last month’s limits are ready to copy from ${monthLabel(addMonths(key, -1))}.`, href: '/casheen/budget' }];
  },
};
