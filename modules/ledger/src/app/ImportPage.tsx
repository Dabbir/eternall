import { useMemo, useState } from 'react';
import { createId, formatMedium } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button } from '@eternall/ui';
import { parseCsv, readRows, type CsvMapping } from '../csv';
import type { Entry } from '../ledger';
import { formatPlain } from '../money';
import { parseQuick } from '../quick';
import { useLedgerData } from './QuickLine';
import { Entered } from './Ceremony';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Bringing a bank statement in (docs/design/ledger.md §Import). The file is read on this device and
 * never stored as a file; choose the columns, check the preview, then write them all (with undo).
 * Categories are guessed from each note the same way the quick line does.
 */
export function ImportPage() {
  const house = useHouse();
  const { entryCol, categories, words } = useLedgerData();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [m, setM] = useState<CsvMapping>({ date: 0, amount: 1, note: 2, allOut: false, header: true });

  const pick = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError('That file is too large for a statement (over 5 MB).');
    const parsed = parseCsv(await file.text());
    if (parsed.length < 1) return setError('That file has no rows.');
    setRows(parsed);
    // Guess columns from the title row.
    const head = (parsed[0] ?? []).map((h) => h.toLowerCase());
    const find = (re: RegExp) => head.findIndex((h) => re.test(h));
    const date = find(/date|tanggal|tgl/u);
    const amount = find(/amount|jumlah|nominal|mutasi|debit|nilai/u);
    const note = find(/note|desc|keterangan|uraian|berita|remark/u);
    setM((x) => ({ ...x, ...(date >= 0 ? { date } : {}), ...(amount >= 0 ? { amount } : {}), note: note >= 0 ? note : x.note }));
  };

  const result = useMemo(() => (rows ? readRows(rows, m) : null), [rows, m]);
  const cols = rows?.[0]?.map((h, i) => ({ i, label: m.header && h ? h : `Column ${i + 1}` })) ?? [];
  const toEntries = (): Entry[] =>
    (result?.ok ?? []).map((r, i) => {
      const guess = parseQuick(`${r.note} 1`, { today: house.today, categories, words });
      const categoryId = guess.kind === r.kind ? guess.categoryId : r.kind === 'in' ? 'other-in' : 'other-out';
      return { id: createId(), kind: r.kind, amount: r.amount, categoryId, date: r.date, note: r.note, createdAt: new Date(Date.now() + i).toISOString() };
    });

  const write = () => {
    const list = toEntries();
    for (const e of list) entryCol.put(e);
    house.toast({ message: `${list.length} entries brought in.`, tone: 'accent', action: { label: 'Undo', run: () => list.forEach((e) => entryCol.remove(e.id)) } });
    const net = list.reduce((s, e) => s + (e.kind === 'in' ? e.amount : -e.amount), 0);
    house.ceremony(<Entered amount={Math.abs(net)} kind={net >= 0 ? 'in' : 'out'} label={`${list.length} entries brought in`} />, 800);
    house.navigate(house.href('/'));
  };

  const select = (label: string, value: number | null, onChange: (v: number | null) => void, allowNone = false) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="input lg-select" value={value ?? -1} onChange={(e) => onChange(Number(e.target.value) < 0 ? null : Number(e.target.value))}>
        {allowNone && <option value={-1}>none</option>}
        {cols.map((c) => (
          <option key={c.i} value={c.i}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <h1 className="lg-month">Bring in a statement</h1>
      <p className="lg-note">Export a CSV from your bank or wallet app. It is read here, on this device, and nothing is sent anywhere.</p>
      <label className="lg-file">
        <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void pick(e.target.files?.[0])} />
        <span>{rows ? 'Choose another file' : 'Choose a CSV file'}</span>
      </label>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {rows && result && (
        <>
          <div className="lg-map">
            {select('Date column', m.date, (v) => setM({ ...m, date: v ?? 0 }))}
            {select('Amount column', m.amount, (v) => setM({ ...m, amount: v ?? 0 }))}
            {select('Note column', m.note, (v) => setM({ ...m, note: v }), true)}
            <label className="check">
              <input type="checkbox" checked={m.header} onChange={(e) => setM({ ...m, header: e.target.checked })} />
              <span className="check__box" aria-hidden="true" />
              The first row is column titles
            </label>
            <label className="check">
              <input type="checkbox" checked={m.allOut} onChange={(e) => setM({ ...m, allOut: e.target.checked })} />
              <span className="check__box" aria-hidden="true" />
              Every row is money out
            </label>
          </div>
          <p className="lg-note" aria-live="polite">
            {result.ok.length} rows ready{result.skipped ? ` · ${result.skipped} left out (no date or amount)` : ''}.
          </p>
          {result.ok.length > 0 && (
            <table className="lg-page">
              <caption className="visually-hidden">Preview of the first rows</caption>
              <thead>
                <tr>
                  <th scope="col" className="lg-col-date">Date</th>
                  <th scope="col">Particulars</th>
                  <th scope="col" className="lg-col-num">In</th>
                  <th scope="col" className="lg-col-num">Out</th>
                </tr>
              </thead>
              <tbody>
                {result.ok.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    <th scope="row" className="lg-col-date">{formatMedium(r.date)}</th>
                    <td>{r.note || '—'}</td>
                    <td className="lg-col-num lg-num">{r.kind === 'in' ? formatPlain(r.amount) : ''}</td>
                    <td className="lg-col-num lg-num">{r.kind === 'out' ? formatPlain(r.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="lg-actions">
            <Button variant="primary" disabled={!result.ok.length} onClick={write}>
              Write {result.ok.length} entries
            </Button>
            <Button variant="quiet" onClick={() => house.navigate(house.href('/budget'))}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </>
  );
}
