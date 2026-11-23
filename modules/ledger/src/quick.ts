import { addDays, type ISODate } from '@eternall/core';
import { FALLBACK, categoriesOf, type Category, type Entry, type Kind } from './ledger';
import { formatRupiah, parseAmount } from './money';
import type { Terms } from './terms';

/**
 * One line in, one entry out (docs/design/ledger.md §Quick line): LEDGER's whole promise is that
 * writing money down takes a single line, like a message to yourself.
 *
 *   "kopi 25rb"            → out · Food · 25.000 · today
 *   "grab 32.500 kemarin"  → out · Transport · 32.500 · yesterday
 *   "gaji 8jt"             → in · Salary · 8.000.000
 *   "listrik 450k 1/11"    → out · Bills · 450.000 · 1 November
 *
 * Pure rules, on this device, in Indonesian and English. No cloud, no AI (docs/adr/0010).
 * What you correct is learned ("kopi" → Food) and kept in the vault as `ledger/words`.
 */

export interface WordsDoc {
  id: 'words';
  /** lower-case word → category id */
  map: Record<string, string>;
}

export interface QuickContext {
  today: ISODate;
  categories: readonly Category[];
  words: Record<string, string>;
  /** Your own shorthand (`ledger/terms`); built-in words always work too. */
  terms?: Terms | undefined;
}

export interface QuickResult {
  amount: number | null;
  kind: Kind;
  categoryId: string;
  /** How the category was chosen, so the preview can say "learned" honestly. */
  categoryFrom: 'learned' | 'guess' | 'default';
  date: ISODate;
  /** The words that set the date ("kemarin", "1/11"), or null for today. */
  dateFrom: string | null;
  note: string;
  /** Your own words it used and how it read them ("goceng → Rp 5.000"), for an honest preview. */
  readAs: string[];
}

export const INCOME = new Set(['gaji', 'salary', 'bonus', 'thr', 'refund', 'cashback', 'income', 'honor', 'honorarium', 'dividen', 'dividend', 'pemasukan', 'payday', 'upah', 'komisi', 'commission']);

/** Built-in guesses for the starting categories; your corrections always win. */
const GUESS: Record<string, readonly string[]> = {
  food: ['kopi', 'coffee', 'makan', 'makanan', 'sarapan', 'breakfast', 'lunch', 'dinner', 'siang', 'malam', 'nasi', 'bakso', 'mie', 'mi', 'soto', 'sate', 'ayam', 'gofood', 'grabfood', 'shopeefood', 'snack', 'jajan', 'resto', 'restoran', 'cafe', 'kafe', 'teh', 'tea', 'roti', 'bread', 'pizza', 'burger', 'warteg', 'padang', 'groceries', 'sayur', 'buah', 'boba', 'minum'],
  transport: ['grab', 'gojek', 'gocar', 'goride', 'ojek', 'ojol', 'krl', 'mrt', 'lrt', 'busway', 'transjakarta', 'tj', 'bus', 'bensin', 'pertalite', 'pertamax', 'fuel', 'parkir', 'parking', 'tol', 'toll', 'taxi', 'taksi', 'bluebird', 'kereta', 'train', 'angkot', 'uber', 'tiket', 'pesawat', 'flight'],
  shopping: ['belanja', 'shopee', 'tokopedia', 'tokped', 'lazada', 'baju', 'kaos', 'celana', 'sepatu', 'shoes', 'clothes', 'indomaret', 'alfamart', 'supermarket', 'mall', 'tas', 'sabun', 'skincare'],
  bills: ['listrik', 'pln', 'token', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'pulsa', 'kuota', 'data', 'sewa', 'kos', 'kost', 'rent', 'bpjs', 'cicilan', 'kredit', 'asuransi', 'insurance', 'langganan', 'subscription', 'netflix', 'spotify', 'youtube', 'icloud', 'tagihan', 'bill', 'pajak', 'tax'],
  fun: ['nonton', 'bioskop', 'cinema', 'movie', 'film', 'game', 'games', 'steam', 'konser', 'concert', 'liburan', 'holiday', 'hotel', 'karaoke', 'buku', 'book', 'hobi', 'hobby'],
  health: ['obat', 'dokter', 'doctor', 'apotek', 'pharmacy', 'klinik', 'clinic', 'rs', 'hospital', 'vitamin', 'gym', 'fitness', 'dentist', 'gigi', 'medical', 'lab'],
  salary: ['gaji', 'salary', 'payday', 'upah'],
};

/** Words that never teach a category on their own. */
const STOP = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'buat', 'untuk', 'utk', 'sama', 'pakai', 'pake', 'beli', 'bayar', 'isi', 'top', 'the', 'for', 'and', 'with', 'from', 'buy', 'pay', 'paid', 'bought', 'lagi', 'aja']);

export const WEEKDAYS: Record<string, number> = {
  minggu: 0, ahad: 0, sunday: 0, senin: 1, monday: 1, selasa: 2, tuesday: 2, rabu: 3, wednesday: 3,
  kamis: 4, thursday: 4, jumat: 5, "jum'at": 5, friday: 5, sabtu: 6, saturday: 6,
};
export const UNITS = new Set(['k', 'rb', 'ribu', 'jt', 'juta']);
/** Words the date reader already knows, so nobody can turn them into something else. */
export const DAY_WORDS = new Set(['hari', 'ini', 'today', 'kemarin', 'kmrn', 'yesterday', 'lusa', 'lalu', 'days', 'ago']);

const lower = (s: string) => s.toLocaleLowerCase('id');
export const wordsOf = (text: string) => lower(text).match(/[\p{L}\p{N}']+/gu) ?? [];

function weekdayBefore(today: ISODate, dow: number): ISODate {
  const d = new Date(`${today}T12:00:00Z`).getUTCDay();
  return addDays(today, -((d - dow + 7) % 7));
}

function numericDate(token: string, today: ISODate): ISODate | null {
  let y: number;
  let mo: number;
  let d: number;
  let hasYear = true;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(token);
  const dm = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/u.exec(token);
  if (iso) [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dm) {
    d = Number(dm[1]);
    mo = Number(dm[2]);
    hasYear = dm[3] !== undefined;
    y = !dm[3] ? Number(today.slice(0, 4)) : dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3]);
  } else return null;
  if (mo < 1 || mo > 12 || d < 1) return null;
  const out = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (new Date(`${out}T12:00:00Z`).getUTCMonth() + 1 !== mo) return null; // 31/2
  // Without a year, a date ahead of today means last year: you write down what happened.
  return !hasYear && out > today ? `${y - 1}${out.slice(4)}` : out;
}

/** Read one line. Never throws; `amount` is null until there is a number in it. */
export function parseQuick(text: string, ctx: QuickContext): QuickResult {
  let raw = text.trim();
  let forcedIn = false;
  if (raw.startsWith('+')) {
    forcedIn = true;
    raw = raw.slice(1).trim();
  } else if (raw.startsWith('-')) raw = raw.slice(1).trim();
  const tokens = raw.split(/\s+/u).filter(Boolean);
  const used = new Set<number>();
  let date = ctx.today;
  let dateFrom: string | null = null;
  let amount: number | null = null;
  const readAs: string[] = [];
  const terms = ctx.terms;
  const myUnits = new Map((terms?.units ?? []).map((u) => [u.word, u.mult === 1000000 ? 'jt' : 'rb'] as const));
  const myFixed = new Map((terms?.fixed ?? []).map((f) => [f.word, f.amount] as const));
  const myDays = new Map((terms?.days ?? []).map((d) => [d.word, d] as const));
  const myIncome = new Set(terms?.income ?? []);
  // Your unit words become the built-in ones before reading ("25rebu" → "25rb", "2 jeti" → "2 jt").
  const norm = tokens.map((t) => {
    const l = lower(t);
    if (myUnits.has(l)) return myUnits.get(l)!;
    for (const [w, unit] of myUnits) {
      const m = new RegExp(`^((?:rp\\.?)?\\d[\\d.,]*)${w.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'iu').exec(t);
      if (m) {
        readAs.push(`${w} → × ${unit === 'jt' ? '1.000.000' : '1.000'}`);
        return `${m[1]}${unit}`;
      }
    }
    return t;
  });
  for (const t of tokens) if (myUnits.has(lower(t))) readAs.push(`${lower(t)} → × ${myUnits.get(lower(t)) === 'jt' ? '1.000.000' : '1.000'}`);

  // Dates first, so "1/11" is never read as an amount.
  for (let i = 0; i < tokens.length && !dateFrom; i++) {
    const t = lower(tokens[i]!);
    const next = lower(tokens[i + 1] ?? '');
    const next2 = lower(tokens[i + 2] ?? '');
    const mine = myDays.get(t);
    if (mine) {
      used.add(i);
      date = mine.weekday !== undefined ? weekdayBefore(ctx.today, mine.weekday) : addDays(ctx.today, -(mine.daysAgo ?? 0));
      dateFrom = tokens[i]!;
      readAs.push(`${t} → ${mine.weekday !== undefined ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mine.weekday] : mine.daysAgo === 0 ? 'today' : mine.daysAgo === 1 ? 'yesterday' : `${mine.daysAgo} days ago`}`);
    } else if (t === 'hari' && next === 'ini') {
      used.add(i).add(i + 1);
      dateFrom = 'hari ini';
    } else if (t === 'today') {
      used.add(i);
      dateFrom = 'today';
    } else if (t === 'kemarin' && next === 'lusa') {
      used.add(i).add(i + 1);
      date = addDays(ctx.today, -2);
      dateFrom = 'kemarin lusa';
    } else if (t === 'kemarin' || t === 'kmrn' || t === 'yesterday') {
      used.add(i);
      date = addDays(ctx.today, -1);
      dateFrom = tokens[i]!;
    } else if (/^\d{1,2}$/u.test(t) && ((next === 'hari' && (next2 === 'lalu' || next2 === 'yang')) || (next === 'days' && next2 === 'ago'))) {
      used.add(i).add(i + 1).add(i + 2);
      if (next2 === 'yang' && lower(tokens[i + 3] ?? '') === 'lalu') used.add(i + 3);
      date = addDays(ctx.today, -Number(t));
      dateFrom = `${t} ${next} ${next2}`;
    } else if (t in WEEKDAYS) {
      used.add(i);
      date = weekdayBefore(ctx.today, WEEKDAYS[t]!);
      dateFrom = tokens[i]!;
    } else if (/[/-]/u.test(t)) {
      const d = numericDate(t, ctx.today);
      if (d) {
        used.add(i);
        date = d;
        dateFrom = tokens[i]!;
      }
    }
  }

  // A word of yours that stands for a sum ("goceng"), times a small count before it ("2 ceban").
  for (let i = 0; i < tokens.length && amount === null; i++) {
    if (used.has(i)) continue;
    const value = myFixed.get(lower(tokens[i]!));
    if (value === undefined) continue;
    const prev = tokens[i - 1];
    const times = prev && !used.has(i - 1) && /^\d{1,2}$/u.test(prev) && Number(prev) > 0 ? Number(prev) : 1;
    amount = Math.min(value * times, 1_000_000_000_000);
    used.add(i);
    if (times > 1) used.add(i - 1);
    readAs.push(`${times > 1 ? `${times} ` : ''}${lower(tokens[i]!)} → ${formatRupiah(amount)}`);
  }

  // The first thing that reads as money, with its unit if it was typed apart ("25 rb").
  for (let i = 0; i < tokens.length && amount === null; i++) {
    if (used.has(i)) continue;
    const t = norm[i]!;
    const unit = lower(norm[i + 1] ?? '');
    if (/^(rp\.?)?\d/iu.test(t) || lower(t) === 'rp') {
      const glued = lower(t) === 'rp' ? `${t}${norm[i + 1] ?? ''}` : t;
      const withUnit = UNITS.has(unit) ? parseAmount(`${glued}${unit}`) : null;
      if (withUnit !== null) {
        amount = withUnit;
        used.add(i).add(i + 1);
      } else {
        const a = parseAmount(glued);
        if (a !== null) {
          amount = a;
          used.add(i);
          if (lower(t) === 'rp') used.add(i + 1);
        }
      }
    }
  }

  const note = tokens.filter((_, i) => !used.has(i)).join(' ');
  const words = wordsOf(note);
  const cats = categoriesOf(ctx.categories).filter((c) => !c.archived);
  const byId = new Map(cats.map((c) => [c.id, c]));

  // What you taught it comes first, and can say "this is income" on its own.
  const learned = words.map((w) => byId.get(ctx.words[w] ?? '')).find(Boolean);
  const myIn = words.find((w) => myIncome.has(w));
  if (myIn) readAs.push(`${myIn} → money in`);
  let kind: Kind = forcedIn || myIn !== undefined || words.some((w) => INCOME.has(w)) ? 'in' : 'out';
  let categoryId: string;
  let categoryFrom: QuickResult['categoryFrom'];
  if (learned) {
    kind = forcedIn ? 'in' : learned.kind;
    categoryId = learned.kind === kind ? learned.id : FALLBACK[kind];
    categoryFrom = learned.kind === kind ? 'learned' : 'default';
  } else {
    const guess = Object.entries(GUESS).find(([id, list]) => byId.get(id)?.kind === kind && words.some((w) => list.includes(w)))?.[0];
    categoryId = guess ?? (byId.has(FALLBACK[kind]) ? FALLBACK[kind] : (cats.find((c) => c.kind === kind)?.id ?? FALLBACK[kind]));
    categoryFrom = guess ? 'guess' : 'default';
  }
  // Listed in the order the words were typed.
  const at = (r: string) => lower(raw).indexOf(r.split(' → ')[0]!.replace(/^\d+ /u, ''));
  readAs.sort((x, y) => at(x) - at(y));
  return { amount, kind, categoryId, categoryFrom, date, dateFrom, note, readAs };
}

/** After you save (or correct) an entry, its words point at its category next time. */
export function learn(map: Record<string, string>, note: string, categoryId: string, max = 500): Record<string, string> {
  const next = { ...map };
  for (const w of wordsOf(note)) {
    if (w.length < 3 || STOP.has(w) || /^\d+$/u.test(w)) continue;
    delete next[w];
    next[w] = categoryId;
  }
  const keys = Object.keys(next);
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) delete next[k];
  return next;
}

export interface Frequent {
  note: string;
  amount: number;
  kind: Kind;
  categoryId: string;
  count: number;
  /** The line that writes it again, e.g. "kopi 25rb". */
  line: string;
}

/** What you write often (same words, amount and category, twice or more in the last 90 days). */
export function frequent(entries: readonly Entry[], today: ISODate, n = 6): Frequent[] {
  const since = addDays(today, -90);
  const groups = new Map<string, Frequent & { last: string }>();
  for (const e of entries) {
    if (e.date < since || !e.note) continue;
    const key = `${e.kind}|${lower(e.note)}|${e.amount}|${e.categoryId}`;
    const g = groups.get(key);
    if (g) {
      g.count++;
      if (e.createdAt > g.last) g.last = e.createdAt;
    } else groups.set(key, { note: e.note, amount: e.amount, kind: e.kind, categoryId: e.categoryId, count: 1, line: '', last: e.createdAt });
  }
  return [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, n)
    .map(({ last: _last, ...g }) => ({ ...g, line: `${g.kind === 'in' ? '+' : ''}${g.note} ${g.amount}` }));
}
