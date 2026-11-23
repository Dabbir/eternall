import type { Entry } from './ledger';
import { frequent, learn, parseQuick, wordsOf } from './quick';

const today = '2026-11-23'; // a Monday
const ctx = { today, categories: [], words: {} };
const q = (text: string, words: Record<string, string> = {}) => parseQuick(text, { ...ctx, words });

describe('the quick line', () => {
  it('reads the examples on the box', () => {
    expect(q('kopi 25rb')).toEqual({ amount: 25000, kind: 'out', categoryId: 'food', categoryFrom: 'guess', date: today, dateFrom: null, note: 'kopi' });
    expect(q('grab 32.500 kemarin')).toMatchObject({ amount: 32500, kind: 'out', categoryId: 'transport', date: '2026-11-22', dateFrom: 'kemarin', note: 'grab' });
    expect(q('gaji 8jt')).toMatchObject({ amount: 8000000, kind: 'in', categoryId: 'salary', note: 'gaji' });
    expect(q('listrik 450k 1/11')).toMatchObject({ amount: 450000, categoryId: 'bills', date: '2026-11-01', dateFrom: '1/11', note: 'listrik' });
  });

  it('takes amounts in many shapes, wherever they sit', () => {
    expect(q('25rb kopi susu').amount).toBe(25000);
    expect(q('makan siang 45 rb').amount).toBe(45000);
    expect(q('makan siang 45 rb').note).toBe('makan siang');
    expect(q('Rp 125.000 sepatu').amount).toBe(125000);
    expect(q('sewa kos 1,5jt').amount).toBe(1500000);
    expect(q('kopi').amount).toBeNull();
    expect(q('').amount).toBeNull();
  });

  it('understands days in Indonesian and English', () => {
    expect(q('parkir 5rb hari ini').date).toBe(today);
    expect(q('parkir 5rb kemarin lusa').date).toBe('2026-11-21');
    expect(q('parkir 5rb 3 hari lalu').date).toBe('2026-11-20');
    expect(q('parkir 5rb 3 days ago').date).toBe('2026-11-20');
    expect(q('parkir 5rb sabtu').date).toBe('2026-11-21');
    expect(q('parkir 5rb senin').date).toBe(today);
    expect(q('parkir 5rb yesterday').date).toBe('2026-11-22');
    expect(q('kado 200rb 25/12').date).toBe('2025-12-25'); // never in the future without a year
    expect(q('kado 200rb 25/12/2026').date).toBe('2026-12-25');
    expect(q('pajak 1jt 2026-03-31').date).toBe('2026-03-31');
    expect(q('x 5rb 31/2').date).toBe(today);
  });

  it('knows income by its words or a plus sign', () => {
    expect(q('+ jual sepeda 1,2jt')).toMatchObject({ kind: 'in', categoryId: 'other-in', amount: 1200000, note: 'jual sepeda' });
    expect(q('cashback 15rb')).toMatchObject({ kind: 'in', categoryId: 'other-in' });
    expect(q('- kopi 25rb').kind).toBe('out');
  });

  it('falls back to Other, honestly', () => {
    expect(q('sesuatu 10rb')).toMatchObject({ categoryId: 'other-out', categoryFrom: 'default' });
  });

  it('learns from you, and what it learned wins', () => {
    let words = learn({}, 'kopi susu', 'fun');
    expect(words).toEqual({ kopi: 'fun', susu: 'fun' });
    expect(q('kopi 25rb', words)).toMatchObject({ categoryId: 'fun', categoryFrom: 'learned' });
    words = learn(words, 'freelance desain', 'other-in');
    expect(q('freelance 2jt', words)).toMatchObject({ kind: 'in', categoryId: 'other-in', categoryFrom: 'learned' });
    expect(learn({}, 'beli di 25 ke', 'food')).toEqual({});
    const many = learn(learn({}, 'aaa bbb ccc', 'food', 2), 'ddd', 'food', 2);
    expect(Object.keys(many)).toEqual(['ccc', 'ddd']);
  });

  it('ignores a learned word whose category was archived', () => {
    const cats = [{ id: 'old', name: 'Old', kind: 'out' as const, order: 0, archived: true }, { id: 'other-out', name: 'Other', kind: 'out' as const, order: 1, archived: false }];
    expect(parseQuick('kopi 25rb', { today, categories: cats, words: { kopi: 'old' } }).categoryId).toBe('other-out');
  });

  it('offers what you write often', () => {
    const e = (id: string, note: string, amount: number, date: string): Entry => ({ id, kind: 'out', amount, categoryId: 'food', date, note, createdAt: `${date}T08:00:00Z` });
    const log = [e('1', 'Kopi', 25000, '2026-11-20'), e('2', 'kopi', 25000, '2026-11-21'), e('3', 'KRL', 5000, '2026-11-21'), e('4', 'kopi', 25000, '2026-06-01')];
    expect(frequent(log, today)).toEqual([{ note: 'Kopi', amount: 25000, kind: 'out', categoryId: 'food', count: 2, line: 'Kopi 25000' }]);
    expect(wordsOf("Jum'at, makan!")).toEqual(["jum'at", 'makan']);
  });
});
