import type { ISODate } from '@eternall/core';
import type { Kind } from './ledger';
import { parseAmount } from './money';

/**
 * Bringing a bank's statement in by file (docs/design/casheen.md §Import). The file never leaves
 * the device; you pick which columns hold the date, amount and note, and see the result first.
 */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/u)[0] ?? '';
  const delim = (firstLine.match(/;/gu)?.length ?? 0) > (firstLine.match(/,/gu)?.length ?? 0) ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

/** "31/12/2026", "31-12-26", "2026-12-31" → ISO; null otherwise. Day first, as Indonesian banks write it. */
export function csvDate(v: string): ISODate | null {
  const s = v.trim().split(/[ T]/u)[0] ?? '';
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(s);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/u.exec(s);
    if (!m) return null;
    [d, mo, y] = [Number(m[1]), Number(m[2]), m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])];
  }
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const t = new Date(`${iso}T12:00:00Z`);
  return t.getUTCMonth() + 1 === mo && t.getUTCDate() === d ? iso : null;
}

/** A signed amount cell: "-25.000", "25.000 DB", "(25.000)", "25,000.00 CR". Out is negative. */
export function csvAmount(v: string): { amount: number; kind: Kind } | null {
  let s = v.trim();
  let negative = /^-|^\(.*\)$|\b(db|dr|debit|debet)\b/iu.test(s);
  if (/\b(cr|kredit|credit)\b/iu.test(s)) negative = false;
  s = s.replace(/[()-]|\b(db|dr|cr|debit|debet|kredit|credit|idr|rp)\b/giu, '').trim();
  // Drop cents: "25,000.00" / "25.000,00".
  s = s.replace(/[.,]\d{2}$/u, '');
  const amount = parseAmount(s);
  return amount === null ? null : { amount, kind: negative ? 'out' : 'in' };
}

export interface CsvMapping {
  date: number;
  amount: number;
  note: number | null;
  /** Statements that list spending as positive numbers can be read as all money out. */
  allOut: boolean;
  /** Skip the first row (column titles). */
  header: boolean;
}

export interface CsvRow {
  date: ISODate;
  amount: number;
  kind: Kind;
  note: string;
}

export function readRows(rows: readonly string[][], m: CsvMapping): { ok: CsvRow[]; skipped: number } {
  const ok: CsvRow[] = [];
  let skipped = 0;
  for (const r of m.header ? rows.slice(1) : rows) {
    const date = csvDate(r[m.date] ?? '');
    const amt = csvAmount(r[m.amount] ?? '');
    if (!date || !amt) {
      skipped++;
      continue;
    }
    ok.push({ date, amount: amt.amount, kind: m.allOut ? 'out' : amt.kind, note: (m.note === null ? '' : (r[m.note] ?? '')).slice(0, 140) });
  }
  return { ok, skipped };
}
