import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createId, formatMedium, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { useCollection } from '@eternall/vault';
import { CATEGORY_PATH, ENTRY_PATH, WORDS_PATH, categoriesOf, type Category, type Entry, type Kind } from '../ledger';
import { formatRupiah, formatShort } from '../money';
import { frequent, learn, parseQuick, type QuickResult, type WordsDoc } from '../quick';
import { EMPTY_TERMS, TERMS_PATH, type Terms } from '../terms';
import { Entered } from './Ceremony';

interface Overrides {
  kind?: Kind | undefined;
  categoryId?: string | undefined;
  date?: ISODate | undefined;
}

/** One line read with whatever you corrected on top. */
export function resolveLine(parsed: QuickResult, o: Overrides, categories: readonly Category[]): QuickResult {
  const kind = o.kind ?? parsed.kind;
  const cat = o.categoryId && categories.find((c) => c.id === o.categoryId && c.kind === kind) ? o.categoryId : parsed.kind === kind ? parsed.categoryId : (categories.find((c) => c.kind === kind && !c.archived)?.id ?? parsed.categoryId);
  return { ...parsed, kind, categoryId: cat, date: o.date ?? parsed.date };
}

export function useLedgerData() {
  const { items: entries, col: entryCol } = useCollection<Entry>(ENTRY_PATH);
  const { items: storedCats, col: catCol } = useCollection<Category>(CATEGORY_PATH);
  const { col: wordsCol } = useCollection<WordsDoc>(WORDS_PATH);
  const categories = useMemo(() => categoriesOf(storedCats), [storedCats]);
  const words = wordsCol.get('words')?.map ?? {};
  const { col: termsCol } = useCollection<Terms>(TERMS_PATH);
  const terms = termsCol.get('terms') ?? EMPTY_TERMS;
  return { entries, entryCol, categories, storedCats, catCol, words, wordsCol, terms, termsCol };
}

/**
 * LEDGER's front door (docs/design/ledger.md §Quick line): write one line, read the preview, press
 * Enter. Each part of the preview is a control, so a wrong guess is one tap to fix, and the fix is
 * learned. Several pasted lines are saved together.
 */
export function QuickLine({ inputRef }: { inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const house = useHouse();
  const { today } = house;
  const { entries, entryCol, categories, words, wordsCol, terms } = useLedgerData();
  const [text, setText] = useState('');
  const [over, setOver] = useState<Overrides>({});
  const id = useId();
  const previewRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => text.split('\n').map((l) => l.trim()).filter(Boolean), [text]);
  const many = lines.length > 1;
  const parsed = useMemo(() => lines.map((l) => parseQuick(l, { today, categories, words, terms })), [lines, today, categories, words, terms]);
  const one = parsed.length === 1 ? resolveLine(parsed[0]!, over, categories) : null;
  const ready = many ? parsed.filter((p) => p.amount !== null) : one && one.amount !== null ? [one] : [];
  const chips = useMemo(() => frequent(entries, today, 6), [entries, today]);
  const catName = (cid: string) => categories.find((c) => c.id === cid)?.name ?? 'Other';

  const save = () => {
    if (!ready.length) return;
    const now = new Date().toISOString();
    const saved: Entry[] = ready.map((r, i) => ({ id: createId(), kind: r.kind, amount: r.amount!, categoryId: r.categoryId, date: r.date, note: r.note.slice(0, 140), createdAt: new Date(Date.parse(now) + i).toISOString() }));
    let map = words;
    for (const e of saved) {
      entryCol.put(e);
      if (e.note) map = learn(map, e.note, e.categoryId);
    }
    if (map !== words) wordsCol.put({ id: 'words', map });
    const first = saved[0]!;
    house.toast({
      message: saved.length > 1 ? `${saved.length} entries written.` : `${first.kind === 'in' ? 'In' : 'Out'} ${formatRupiah(first.amount)} · ${catName(first.categoryId)}${first.date === today ? '' : ` · ${formatMedium(first.date)}`}`,
      tone: 'accent',
      action: { label: 'Undo', run: () => saved.forEach((e) => entryCol.remove(e.id)) },
    });
    setText('');
    setOver({});
    inputRef.current?.focus();
    const net = saved.reduce((s, e) => s + (e.kind === 'in' ? e.amount : -e.amount), 0);
    house.ceremony(
      saved.length > 1 ? (
        <Entered amount={Math.abs(net)} kind={net >= 0 ? 'in' : 'out'} label={`${saved.length} entries · ${net >= 0 ? 'net in' : 'net out'}`} />
      ) : (
        <Entered amount={first.amount} kind={first.kind} label={`${first.kind === 'in' ? 'In' : 'Out'} · ${catName(first.categoryId)}`} />
      ),
      600,
    );
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape' && text) {
      e.preventDefault();
      setText('');
      setOver({});
    }
  };

  // After fixing a part, the cursor goes back to the line so Enter writes it.
  const correct = (o: Overrides) => {
    setOver((prev) => ({ ...prev, ...o }));
    inputRef.current?.focus();
  };
  const kindCats = one ? categories.filter((c) => c.kind === one.kind && !c.archived) : [];
  return (
    <section className="lq" aria-label="Quick line">
      <label id={`${id}-label`} htmlFor={`${id}-input`} className="lq-label">
        Write one line
      </label>
      <div className="lq-line">
        <span className="lq-pen" aria-hidden="true">
          ✎
        </span>
        <textarea
          id={`${id}-input`}
          ref={inputRef}
          className="lq-input"
          rows={many ? Math.min(6, lines.length) : 1}
          value={text}
          placeholder="kopi 25rb · gaji 8jt · grab 32.500 kemarin"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby={`${id}-preview ${id}-help`}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value.trim()) setOver({});
          }}
          onKeyDown={onKey}
        />
        <button type="button" className="lq-save" onClick={save} disabled={!ready.length}>
          {many ? `Write ${ready.length}` : 'Write it'}
        </button>
      </div>

      <div id={`${id}-preview`} ref={previewRef} className="lq-preview" aria-live="polite">
        {!text.trim() ? (
          chips.length ? (
            <ul className="lq-chips" aria-label="Write again">
              {chips.map((c) => (
                <li key={c.line}>
                  <button
                    type="button"
                    className="lq-chip"
                    onClick={() => {
                      setText(`${c.kind === 'in' ? '+' : ''}${c.note} ${formatShort(c.amount)}`);
                      setOver({ kind: c.kind, categoryId: c.categoryId });
                      inputRef.current?.focus();
                    }}
                  >
                    {c.note} <span>{formatShort(c.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null
        ) : many ? (
          <p className="lq-many">
            {ready.length} of {lines.length} lines ready{ready.length < lines.length ? ` · ${lines.length - ready.length} without an amount will be left out` : ''}.
          </p>
        ) : one && one.amount === null ? (
          <p className="lq-wait">Add an amount: 25rb, 25.000, 1,5jt.</p>
        ) : one ? (
          <div className="lq-parts">
            <button type="button" className={`lq-part lq-part--kind is-${one.kind}`} aria-label={`${one.kind === 'in' ? 'Money in' : 'Money out'}; change`} onClick={() => correct({ kind: one.kind === 'in' ? 'out' : 'in', categoryId: undefined })}>
              {one.kind === 'in' ? 'In' : 'Out'}
            </button>
            <span className="lq-part lq-part--amount">{formatRupiah(one.amount!)}</span>
            <span className="lq-part lq-part--select">
              <select aria-label="Category" value={one.categoryId} onChange={(e) => correct({ categoryId: e.target.value })}>
                {kindCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {one.categoryFrom === 'learned' && !over.categoryId && <em className="lq-learned">learned</em>}
            </span>
            <label className="lq-part lq-part--date">
              <span className="visually-hidden">Date</span>
              <span aria-hidden="true">{one.date === today ? 'today' : formatMedium(one.date)}</span>
              <input type="date" value={one.date} max="9999-12-31" onChange={(e) => e.target.value && correct({ date: e.target.value })} />
            </label>
            {one.note && <span className="lq-part lq-part--note">“{one.note}”</span>}
            {one.readAs.length > 0 && <span className="lq-readas">your words: {one.readAs.join(' · ')}</span>}
          </div>
        ) : null}
      </div>
      <p id={`${id}-help`} className="lq-help">
        Enter writes it · tap a part to change it · Shift+Enter for another line
      </p>
    </section>
  );
}
