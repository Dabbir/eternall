import type { ImprintDefinition } from '@eternall/core';
import { BUDGET_PATH, CATEGORY_PATH, DEFAULT_PREF, ENTRY_PATH, PREF_PATH, WORDS_PATH, addMonths, ledgerStats, monthKey, monthLabel, type Budget, type Entry, type LedgerPref } from './ledger';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[]; get(id: string): T | undefined } } };
const entries = (ctx: Readable) => ctx.data.collection<Entry>(ENTRY_PATH).all();

/**
 * LEDGER (docs/design/ledger.md, ADR 0012): money in and out, written in one line, and a monthly
 * budget. Amounts never leave LEDGER: the house only ever sees counts.
 */
export const ledger: ImprintDefinition = {
  id: 'ledger',
  name: 'LEDGER',
  functionLine: 'Money, kept plainly',
  basePath: '/ledger/',
  release: 2,
  accent: { light: '#2f5d3a', dark: '#8fc79b' },
  intro: 'Write money down in one line, like a message to yourself: “kopi 25rb”, “gaji 8jt”, “grab 32.500 kemarin”. It learns your words as you go. Months are on the right edge, like a ledger’s thumb index.',
  brand: { icon: '/icons/ledger.svg', themeColor: { light: '#eef1e4', dark: '#111611' }, lockTitle: 'The book is closed.', leaveLabel: 'Close the book' },
  load: () => import('./app/LedgerApp'),
  collections: [ENTRY_PATH, CATEGORY_PATH, BUDGET_PATH, WORDS_PATH, PREF_PATH],
  hasData: (ctx) => entries(ctx).length > 0,

  almanacFacts(ctx) {
    const st = ledgerStats(entries(ctx), ctx.today.slice(0, 4));
    if (!st.entries) return [];
    return [
      { imprint: 'ledger', label: 'Months kept in LEDGER this year', value: String(st.months) },
      { imprint: 'ledger', label: 'Entries written this year', value: st.entries.toLocaleString('en-GB') },
    ];
  },

  reminders(ctx) {
    const pref = ctx.data.collection<LedgerPref>(PREF_PATH).get('pref') ?? DEFAULT_PREF;
    if (!pref.remindBudget || ctx.today.slice(8) !== '01') return [];
    const key = monthKey(ctx.today);
    const has = ctx.data.collection<Budget>(BUDGET_PATH).get(key);
    if (has) return [];
    return [{ imprint: 'ledger', key: `ledger_budget_${key}`, date: ctx.today, title: `Set the budget for ${monthLabel(key)}`, body: `Last month’s limits are ready to copy from ${monthLabel(addMonths(key, -1))}.`, href: '/ledger/budget' }];
  },
};
