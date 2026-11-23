import { useMemo, useState } from 'react';
import { formatMedium } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, TextField } from '@eternall/ui';
import { categoriesOf } from '../ledger';
import { formatRupiah, parseAmount } from '../money';
import { parseQuick } from '../quick';
import { BUILT_IN, DAY_CHOICES, addTerm, dayLabel, removeTerm, validateFixedAmount, validateWord, type Terms } from '../terms';
import { useLedgerData } from './QuickLine';

/**
 * "Your words" (docs/design/casheen.md §Shorthand): the shorthand you really type, taught to the
 * quick line. Built-in words keep working and are listed beside yours; a word you add can't
 * collide with one that already means something else. Try any line at the top to see how it reads.
 */
export function WordsPage() {
  const { terms, termsCol, words, wordsCol, categories } = useLedgerData();
  const save = (t: Terms) => termsCol.put(t);
  return (
    <>
      <h1 className="lg-month">Your words</h1>
      <p className="lg-note">Teach the quick line the shorthand you really use. Its own words keep working beside yours.</p>
      <TryLine />
      <AmountWords terms={terms} onChange={save} />
      <DayWords terms={terms} onChange={save} />
      <IncomeWords terms={terms} onChange={save} />
      <Learned words={words} categories={categoriesOf(categories)} onChange={(map) => wordsCol.put({ id: 'words', map })} />
    </>
  );
}

function TryLine() {
  const house = useHouse();
  const { categories, words, terms } = useLedgerData();
  const [text, setText] = useState('');
  const r = useMemo(() => (text.trim() ? parseQuick(text, { today: house.today, categories, words, terms }) : null), [text, house.today, categories, words, terms]);
  const cat = r ? (categories.find((c) => c.id === r.categoryId)?.name ?? 'Other') : '';
  return (
    <section className="lw-try" aria-labelledby="lw-try-title">
      <h2 id="lw-try-title" className="lg-h2">Try a line</h2>
      <TextField label="A line, as you'd type it" value={text} placeholder="parkir goceng semalem" onChange={(e) => setText(e.target.value)} />
      <p className="lw-try__out" aria-live="polite">
        {!r ? 'Type something to see how it reads.' : r.amount === null ? 'No amount found yet.' : `${r.kind === 'in' ? 'In' : 'Out'} · ${formatRupiah(r.amount)} · ${cat} · ${r.date === house.today ? 'today' : formatMedium(r.date)}${r.note ? ` · “${r.note}”` : ''}`}
        {r && r.readAs.length > 0 && <span className="lq-readas"> your words: {r.readAs.join(' · ')}</span>}
      </p>
    </section>
  );
}

function AddRow({ children, onSubmit }: { children: React.ReactNode; onSubmit(): void }) {
  return (
    <form className="lw-add" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      {children}
      <Button variant="ghost" type="submit">
        Add
      </Button>
    </form>
  );
}

function Remove({ word, onRemove }: { word: string; onRemove(): void }) {
  return (
    <button type="button" className="lg-link lw-remove" onClick={onRemove} aria-label={`Remove ${word}`}>
      Remove
    </button>
  );
}

function AmountWords({ terms, onChange }: { terms: Terms; onChange(t: Terms): void }) {
  const [word, setWord] = useState('');
  const [means, setMeans] = useState<'1000' | '1000000' | 'fixed'>('fixed');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<{ word?: string | undefined; amount?: string | undefined }>({});
  const add = () => {
    const kind = means === 'fixed' ? 'fixed' : 'unit';
    const wErr = validateWord(word, kind, terms);
    const value = parseAmount(amount);
    const aErr = means === 'fixed' ? validateFixedAmount(value) : null;
    if (wErr || aErr) return setError({ word: wErr ?? undefined, amount: aErr ?? undefined });
    onChange(means === 'fixed' ? addTerm(terms, { kind: 'fixed', word, amount: value! }) : addTerm(terms, { kind: 'unit', word, mult: means === '1000' ? 1000 : 1000000 }));
    setWord('');
    setAmount('');
    setError({});
  };
  const rows = [...terms.units.map((u) => ({ word: u.word, means: `× ${u.mult === 1000 ? '1.000' : '1.000.000'}`, example: `25${u.word}` })), ...terms.fixed.map((f) => ({ word: f.word, means: formatRupiah(f.amount), example: `parkir ${f.word}` }))];
  return (
    <section className="lw-section" aria-labelledby="lw-amount">
      <h2 id="lw-amount" className="lg-h2">Amount words</h2>
      <p className="lw-builtin">Already understood: {BUILT_IN.units.join(', ')} (and 25.000, Rp 25.000)</p>
      {rows.length > 0 && (
        <ul className="lw-list">
          {rows.map((r) => (
            <li key={r.word}>
              <span className="lw-word">{r.word}</span>
              <span className="lw-means lg-num">{r.means}</span>
              <span className="lw-example">e.g. “{r.example}”</span>
              <Remove word={r.word} onRemove={() => onChange(removeTerm(terms, r.word))} />
            </li>
          ))}
        </ul>
      )}
      <AddRow onSubmit={add}>
        <TextField label="Word" value={word} placeholder="goceng" maxLength={20} error={error.word} onChange={(e) => { setWord(e.target.value); setError({}); }} />
        <label className="field">
          <span className="field__label">Means</span>
          <select className="input lg-select" value={means} onChange={(e) => setMeans(e.target.value as typeof means)}>
            <option value="fixed">a fixed amount</option>
            <option value="1000">× 1.000 (like rb)</option>
            <option value="1000000">× 1.000.000 (like jt)</option>
          </select>
        </label>
        {means === 'fixed' && <TextField label="Amount" inputMode="decimal" value={amount} placeholder="5rb" error={error.amount} onChange={(e) => { setAmount(e.target.value); setError({}); }} />}
      </AddRow>
    </section>
  );
}

function DayWords({ terms, onChange }: { terms: Terms; onChange(t: Terms): void }) {
  const [word, setWord] = useState('');
  const [choice, setChoice] = useState('ago-1');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const err = validateWord(word, 'day', terms);
    if (err) return setError(err);
    const term = DAY_CHOICES.find((c) => c.value === choice)!.term;
    onChange(addTerm(terms, { kind: 'day', word, ...(term.weekday !== undefined ? { weekday: term.weekday } : { daysAgo: term.daysAgo ?? 0 }) }));
    setWord('');
    setError(null);
  };
  return (
    <section className="lw-section" aria-labelledby="lw-days">
      <h2 id="lw-days" className="lg-h2">Day words</h2>
      <p className="lw-builtin">Already understood: {BUILT_IN.days.join(', ')}</p>
      {terms.days.length > 0 && (
        <ul className="lw-list">
          {terms.days.map((d) => (
            <li key={d.word}>
              <span className="lw-word">{d.word}</span>
              <span className="lw-means">{dayLabel(d)}</span>
              <span className="lw-example">e.g. “bakso 20rb {d.word}”</span>
              <Remove word={d.word} onRemove={() => onChange(removeTerm(terms, d.word))} />
            </li>
          ))}
        </ul>
      )}
      <AddRow onSubmit={add}>
        <TextField label="Word" value={word} placeholder="semalem" maxLength={20} error={error ?? undefined} onChange={(e) => { setWord(e.target.value); setError(null); }} />
        <label className="field">
          <span className="field__label">Means</span>
          <select className="input lg-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {DAY_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </AddRow>
    </section>
  );
}

function IncomeWords({ terms, onChange }: { terms: Terms; onChange(t: Terms): void }) {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const err = validateWord(word, 'income', terms);
    if (err) return setError(err);
    onChange(addTerm(terms, { kind: 'income', word }));
    setWord('');
    setError(null);
  };
  return (
    <section className="lw-section" aria-labelledby="lw-income">
      <h2 id="lw-income" className="lg-h2">Money-in words</h2>
      <p className="lw-builtin">Already understood: {BUILT_IN.income.join(', ')}, or a + at the start</p>
      {terms.income.length > 0 && (
        <ul className="lw-chips">
          {terms.income.map((w) => (
            <li key={w}>
              <span>{w}</span>
              <button type="button" aria-label={`Remove ${w}`} onClick={() => onChange(removeTerm(terms, w))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow onSubmit={add}>
        <TextField label="Word" value={word} placeholder="cair" maxLength={20} error={error ?? undefined} onChange={(e) => { setWord(e.target.value); setError(null); }} />
      </AddRow>
    </section>
  );
}

function Learned({ words, categories, onChange }: { words: Record<string, string>; categories: ReturnType<typeof categoriesOf>; onChange(map: Record<string, string>): void }) {
  const house = useHouse();
  const [confirm, setConfirm] = useState(false);
  const list = Object.entries(words).sort((a, b) => a[0].localeCompare(b[0]));
  const usable = categories.filter((c) => !c.archived);
  return (
    <section className="lw-section" aria-labelledby="lw-learned">
      <h2 id="lw-learned" className="lg-h2">Words it has learned</h2>
      <p className="lw-builtin">Each time you write or correct an entry, its words point at that category next time. Change or forget any of them here.</p>
      {list.length === 0 ? (
        <p className="lg-note">Nothing learned yet.</p>
      ) : (
        <>
          <ul className="lw-list">
            {list.map(([w, cat]) => (
              <li key={w}>
                <span className="lw-word">{w}</span>
                <label className="lw-means">
                  <span className="visually-hidden">Category for {w}</span>
                  <select className="lg-select lw-select" value={cat} onChange={(e) => onChange({ ...words, [w]: e.target.value })}>
                    {!usable.some((c) => c.id === cat) && <option value={cat}>(put away)</option>}
                    {usable.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="lw-example" />
                <button
                  type="button"
                  className="lg-link lw-remove"
                  aria-label={`Forget ${w}`}
                  onClick={() => {
                    const next = { ...words };
                    delete next[w];
                    onChange(next);
                  }}
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>
          {confirm ? (
            <p className="lw-confirm">
              Forget all {list.length} words?{' '}
              <Button variant="danger" size="s" onClick={() => { const prev = words; onChange({}); setConfirm(false); house.toast({ message: 'All learned words forgotten.', action: { label: 'Undo', run: () => onChange(prev) } }); }}>
                Forget them all
              </Button>{' '}
              <Button variant="quiet" size="s" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </p>
          ) : (
            <button type="button" className="lg-link" onClick={() => setConfirm(true)}>
              Forget everything it learned
            </button>
          )}
        </>
      )}
    </section>
  );
}
