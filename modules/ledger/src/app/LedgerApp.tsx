import '@fontsource/libre-caslon-text/latin-400.css';
import '@fontsource/libre-caslon-text/latin-400-italic.css';
import '@fontsource/libre-caslon-text/latin-700.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import '../theme/ledger.css';
import '../theme/ledger.kit.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createId, formatMedium, type FieldErrors, type ImprintAppProps } from '@eternall/core';
import { usePrimaryAction, useHouse } from '@eternall/kit';
import { Button, Dialog, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { BUDGET_PATH, DEFAULT_CATEGORIES, DEFAULT_PREF, PREF_PATH, addMonths, budgetFor, budgetRows, budgetTotal, byDay, entriesIn, isMonthKey, monthKey, monthLabel, totals, validateCategoryName, validateEntry, type Budget, type Category, type Entry, type EntryInput, type Kind, type LedgerPref } from '../ledger';
import { formatPlain, formatRupiah, parseAmount } from '../money';
import { learn } from '../quick';
import { Chrome, type LedgerPlace } from './Chrome';
import { QuickLine, useLedgerData } from './QuickLine';
import { ImportPage } from './ImportPage';

export default function LedgerApp({ path, search }: ImprintAppProps) {
  const house = useHouse();
  const current = monthKey(house.today);
  const quickRef = useRef<HTMLTextAreaElement>(null);
  const seg = path.split('/').filter(Boolean);
  const place: LedgerPlace = seg[0] === 'budget' ? 'budget' : seg[0] === 'import' ? 'import' : 'month';
  const asked = place === 'budget' ? seg[1] : seg[0];
  const month = asked && isMonthKey(asked) ? asked : current;

  usePrimaryAction({
    label: 'Add an entry',
    run: () => {
      if (place !== 'month') house.navigate(house.href(`/${month}`));
      window.setTimeout(() => {
        window.scrollTo({ top: 0 });
        quickRef.current?.focus();
      }, 0);
    },
  });

  // The installed app's "Add an entry" shortcut opens straight into the quick line.
  const write = search.get('write');
  useEffect(() => {
    if (write) quickRef.current?.focus();
  }, [write]);

  return (
    <Chrome here={place} month={month}>
      <div className="lg">
        {place === 'budget' ? <BudgetPage month={month} /> : place === 'import' ? <ImportPage /> : <MonthPage month={month} quickRef={quickRef} />}
      </div>
    </Chrome>
  );
}

function MonthNav({ month, base }: { month: string; base: string }) {
  const house = useHouse();
  const current = monthKey(house.today);
  return (
    <div className="lg-monthnav">
      <button type="button" className="lg-monthnav__btn" onClick={() => house.navigate(house.href(`${base}/${addMonths(month, -1)}`))} aria-label={`Previous month, ${monthLabel(addMonths(month, -1))}`}>
        ‹
      </button>
      <h1 className="lg-month">{monthLabel(month)}</h1>
      <button type="button" className="lg-monthnav__btn" disabled={month >= current} onClick={() => house.navigate(house.href(`${base}/${addMonths(month, 1)}`))} aria-label={`Next month, ${monthLabel(addMonths(month, 1))}`}>
        ›
      </button>
      {month !== current && (
        <button type="button" className="lg-link" onClick={() => house.navigate(house.href(`${base}/${current}`))}>
          Back to this month
        </button>
      )}
    </div>
  );
}

function MonthPage({ month, quickRef }: { month: string; quickRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const house = useHouse();
  const { entries, categories } = useLedgerData();
  const { items: budgets } = useCollection<Budget>(BUDGET_PATH);
  const mine = useMemo(() => entriesIn(entries, month), [entries, month]);
  const t = totals(mine);
  const days = byDay(mine);
  const { budget } = budgetFor(budgets, month);
  const rows = budgetRows(entries, budget, categories, month);
  const bt = budgetTotal(rows);
  const overs = rows.filter((r) => r.over);
  const [editing, setEditing] = useState<Entry | null>(null);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';

  return (
    <>
      <MonthNav month={month} base="" />
      <QuickLine inputRef={quickRef} />

      <dl className="lg-totals" aria-label={`${monthLabel(month)} totals`}>
        <div>
          <dt>In</dt>
          <dd className="lg-num">{formatRupiah(t.in)}</dd>
        </div>
        <div>
          <dt>Out</dt>
          <dd className="lg-num">{formatRupiah(t.out)}</dd>
        </div>
        <div className="lg-totals__net">
          <dt>{t.net < 0 ? 'Spent more than came in' : 'Kept'}</dt>
          <dd className={`lg-num ${t.net < 0 ? 'is-red' : ''}`}>{formatRupiah(t.net)}</dd>
        </div>
      </dl>
      {bt.limit > 0 && (
        <p className="lg-budgetline">
          <button type="button" className="lg-link" onClick={() => house.navigate(house.href(`/budget/${month}`))}>
            Budget
          </button>
          {': '}
          {bt.left >= 0 ? `${formatRupiah(bt.left)} left of ${formatRupiah(bt.limit)}` : <span className="is-red">over by {formatRupiah(-bt.left)}</span>}
          {overs.length > 0 && bt.left >= 0 && <span className="is-red"> · {overs.map((o) => `${o.category.name} over by ${formatRupiah(-o.left!)}`).join(' · ')}</span>}
        </p>
      )}

      {days.length === 0 ? (
        <div className="lg-empty">
          <p className="lg-empty__line">Nothing written in {monthLabel(month)} yet.</p>
          <p className="lg-empty__try">
            Try typing <kbd>kopi 25rb</kbd> above and pressing Enter.
          </p>
        </div>
      ) : (
        <table className="lg-page">
          <caption className="visually-hidden">Entries in {monthLabel(month)}, newest first</caption>
          <thead>
            <tr>
              <th scope="col" className="lg-col-date">Date</th>
              <th scope="col">Particulars</th>
              <th scope="col" className="lg-col-num">In</th>
              <th scope="col" className="lg-col-num">Out</th>
            </tr>
          </thead>
          {days.map((d) => (
            <tbody key={d.date}>
              {d.entries.map((e, i) => (
                <tr key={e.id} className={i === 0 ? 'is-first' : ''}>
                  <th scope="row" className="lg-col-date">
                    {i === 0 ? formatMedium(d.date).replace(/ \d{4}$/u, '') : <span className="visually-hidden">{formatMedium(d.date)}</span>}
                  </th>
                  <td>
                    <button type="button" className="lg-entry" onClick={() => setEditing(e)}>
                      <span className="lg-entry__note">{e.note || catName(e.categoryId)}</span>
                      <span className="lg-entry__cat">{catName(e.categoryId)}</span>
                    </button>
                  </td>
                  <td className="lg-col-num lg-num">{e.kind === 'in' ? formatPlain(e.amount) : ''}</td>
                  <td className="lg-col-num lg-num">{e.kind === 'out' ? formatPlain(e.amount) : ''}</td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Carried to the month’s total
              </th>
              <td className="lg-col-num lg-num">{formatPlain(t.in)}</td>
              <td className="lg-col-num lg-num">{formatPlain(t.out)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {editing && <EntryEditor key={editing.id} entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Correcting an entry: every field, plus remove (with undo). A changed category is learned. */
function EntryEditor({ entry, onClose }: { entry: Entry; onClose(): void }) {
  const house = useHouse();
  const { entryCol, categories, words, wordsCol } = useLedgerData();
  const [form, setForm] = useState({ kind: entry.kind as string, amount: formatPlain(entry.amount), categoryId: entry.categoryId, date: entry.date, note: entry.note });
  const [errors, setErrors] = useState<FieldErrors<keyof EntryInput>>({});
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === 'kind' ? { categoryId: categories.find((c) => c.kind === v && !c.archived)?.id ?? f.categoryId } : {}) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const save = () => {
    const r = validateEntry({ ...form, amount: parseAmount(form.amount) }, categories);
    if (!r.ok) return setErrors(r.errors);
    entryCol.put({ ...entry, ...r.value });
    if (r.value.note && r.value.categoryId !== entry.categoryId) wordsCol.put({ id: 'words', map: learn(words, r.value.note, r.value.categoryId) });
    house.toast({ message: 'Entry corrected.', tone: 'accent' });
    onClose();
  };
  const remove = () => {
    entryCol.remove(entry.id);
    house.toast({ message: 'Entry crossed out.', action: { label: 'Undo', run: () => entryCol.put(entry) } });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="LEDGER · One entry"
      title="Correct this entry"
      footer={
        <>
          <Button variant="quiet" onClick={remove}>
            Cross it out
          </Button>
          <span className="spacer" />
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="lg-entry-form">
            Save
          </Button>
        </>
      }
    >
      <form id="lg-entry-form" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <fieldset className="lg-kind">
          <legend>Which way</legend>
          {(['out', 'in'] as Kind[]).map((k) => (
            <label key={k} className="lg-kind__opt">
              <input type="radio" name="kind" checked={form.kind === k} onChange={() => set('kind', k)} />
              <span>{k === 'out' ? 'Money out' : 'Money in'}</span>
            </label>
          ))}
        </fieldset>
        <TextField label="Amount (Rp)" inputMode="decimal" value={form.amount} error={errors.amount} onChange={(e) => set('amount', e.target.value)} hint="25.000, 25rb or 1,5jt" />
        <label className="field">
          <span className="field__label">Category</span>
          <select className="input lg-select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories
              .filter((c) => c.kind === form.kind && (!c.archived || c.id === form.categoryId))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          {errors.categoryId && <span className="field__error">{errors.categoryId}</span>}
        </label>
        <TextField label="Date" type="date" value={form.date} error={errors.date} onChange={(e) => set('date', e.target.value)} />
        <TextField label="Note (optional)" value={form.note} maxLength={140} error={errors.note} onChange={(e) => set('note', e.target.value)} />
      </form>
    </Dialog>
  );
}

function BudgetPage({ month }: { month: string }) {
  const house = useHouse();
  const { entries, categories, storedCats, catCol } = useLedgerData();
  const { items: budgets, col: budgetCol } = useCollection<Budget>(BUDGET_PATH);
  const { col: prefCol } = useCollection<LedgerPref>(PREF_PATH);
  const pref = prefCol.get('pref') ?? DEFAULT_PREF;
  const { budget, copiedFrom } = budgetFor(budgets, month);
  const rows = budgetRows(entries, budget, categories, month);
  const bt = budgetTotal(rows);
  const setLimit = (catId: string, raw: string, current: number | null) => {
    const v = raw.trim() ? parseAmount(raw) : null;
    if (raw.trim() && v === null) return house.toast({ message: 'That limit isn’t an amount. Try 500rb or 500.000.', tone: 'error' });
    if (v === current) return;
    const limits = { ...budget?.limits };
    if (v === null) delete limits[catId];
    else limits[catId] = v;
    budgetCol.put({ id: month, limits });
  };

  // Changing categories turns the starting set into your own list first.
  const ensureOwn = (): Category[] => {
    if (storedCats.length) return [...storedCats];
    for (const c of DEFAULT_CATEGORIES) catCol.put(c);
    return [...DEFAULT_CATEGORIES];
  };
  const [adding, setAdding] = useState<null | { name: string; kind: Kind; error?: string | undefined }>(null);
  const addCategory = () => {
    if (!adding) return;
    const list = ensureOwn();
    const err = validateCategoryName(adding.name, list);
    if (err) return setAdding({ ...adding, error: err });
    catCol.put({ id: createId(), name: adding.name.trim(), kind: adding.kind, order: list.length, archived: false });
    setAdding(null);
  };
  const toggleArchive = (c: Category) => {
    ensureOwn();
    catCol.put({ ...c, archived: !c.archived });
    house.toast({ message: c.archived ? `${c.name} is back.` : `${c.name} put away. Its past entries stay.` });
  };
  const rename = (c: Category, name: string) => {
    const list = ensureOwn();
    const err = validateCategoryName(name, list.filter((x) => x.id !== c.id));
    if (err) return house.toast({ message: err, tone: 'error' });
    catCol.put({ ...c, name: name.trim() });
  };

  return (
    <>
      <MonthNav month={month} base="/budget" />
      {copiedFrom && (
        <p className="lg-note">
          Starting from {monthLabel(copiedFrom)}’s limits.{' '}
          <button type="button" className="lg-link" onClick={() => budgetCol.put(budget!)}>
            Keep them for {monthLabel(month)}
          </button>
        </p>
      )}
      <table className="lg-page lg-budget">
        <caption className="visually-hidden">Budget for {monthLabel(month)}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col" className="lg-col-num">Limit</th>
            <th scope="col" className="lg-col-num">Spent</th>
            <th scope="col" className="lg-col-num">Left</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category.id}>
              <th scope="row">{r.category.name}</th>
              <td className="lg-col-num">
                <input
                  key={`${month}-${r.category.id}-${r.limit ?? 'none'}`}
                  className="lg-limit lg-num"
                  inputMode="decimal"
                  aria-label={`Limit for ${r.category.name}`}
                  placeholder="no limit"
                  defaultValue={r.limit !== null ? formatPlain(r.limit) : ''}
                  onBlur={(e) => setLimit(r.category.id, e.target.value, r.limit)}
                  onKeyDown={(e) => {
                    // Enter saves at once; leaving the field saves too.
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    setLimit(r.category.id, e.currentTarget.value, r.limit);
                  }}
                />
              </td>
              <td className="lg-col-num lg-num">{formatPlain(r.spent)}</td>
              <td className={`lg-col-num lg-num ${r.over ? 'is-red' : ''}`}>{r.left === null ? '—' : r.over ? `over by ${formatPlain(-r.left)}` : formatPlain(r.left)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">With a limit</th>
            <td className="lg-col-num lg-num">{formatPlain(bt.limit)}</td>
            <td className="lg-col-num lg-num">{formatPlain(bt.spent)}</td>
            <td className={`lg-col-num lg-num ${bt.left < 0 ? 'is-red' : ''}`}>{bt.left < 0 ? `over by ${formatPlain(-bt.left)}` : formatPlain(bt.left)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="lg-cats" aria-labelledby="lg-cats-title">
        <h2 id="lg-cats-title" className="lg-h2">Categories</h2>
        <ul className="lg-catlist">
          {categories.map((c) => (
            <li key={c.id} className={c.archived ? 'is-archived' : ''}>
              <input className="lg-catname" defaultValue={c.name} aria-label={`Rename ${c.name}`} maxLength={30} onBlur={(e) => e.target.value.trim() !== c.name && rename(c, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (e.currentTarget.value.trim() !== c.name) rename(c, e.currentTarget.value); } }} />
              <span className="lg-catkind">{c.kind === 'in' ? 'money in' : 'money out'}</span>
              <button type="button" className="lg-link" onClick={() => toggleArchive(c)}>
                {c.archived ? 'Bring back' : 'Put away'}
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form className="lg-addcat" onSubmit={(e) => { e.preventDefault(); addCategory(); }}>
            <TextField label="New category" autoFocus value={adding.name} maxLength={30} error={adding.error} onChange={(e) => setAdding({ ...adding, name: e.target.value, error: undefined })} />
            <label className="field">
              <span className="field__label">For</span>
              <select className="input lg-select" value={adding.kind} onChange={(e) => setAdding({ ...adding, kind: e.target.value as Kind })}>
                <option value="out">money out</option>
                <option value="in">money in</option>
              </select>
            </label>
            <Button variant="primary" type="submit">
              Add
            </Button>
            <Button variant="quiet" onClick={() => setAdding(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button variant="ghost" onClick={() => setAdding({ name: '', kind: 'out' })}>
            Add a category
          </Button>
        )}
      </section>

      <section className="lg-more" aria-label="More">
        <label className="check">
          <input type="checkbox" checked={pref.remindBudget} onChange={(e) => prefCol.put({ ...pref, remindBudget: e.target.checked })} />
          <span className="check__box" aria-hidden="true" />
          Remind me on the 1st to set the month’s budget
        </label>
        <button type="button" className="lg-link" onClick={() => house.navigate(house.href('/import'))}>
          Bring in a bank statement (CSV)
        </button>
      </section>
    </>
  );
}
