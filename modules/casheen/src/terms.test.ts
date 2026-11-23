import { parseQuick } from './quick';
import { BUILT_IN, EMPTY_TERMS, addTerm, dayLabel, meaningOf, removeTerm, validateFixedAmount, validateWord, type Terms } from './terms';

const today = '2026-11-23'; // a Monday
let mine: Terms = EMPTY_TERMS;
mine = addTerm(mine, { kind: 'unit', word: 'Rebu', mult: 1000 });
mine = addTerm(mine, { kind: 'unit', word: 'jeti', mult: 1000000 });
mine = addTerm(mine, { kind: 'fixed', word: 'goceng', amount: 5000 });
mine = addTerm(mine, { kind: 'fixed', word: 'ceban', amount: 10000 });
mine = addTerm(mine, { kind: 'day', word: 'semalem', daysAgo: 1 });
mine = addTerm(mine, { kind: 'day', word: 'sab', weekday: 6 });
mine = addTerm(mine, { kind: 'income', word: 'cair' });
const q = (text: string, terms: Terms = mine) => parseQuick(text, { today, categories: [], words: {}, terms });

describe('your shorthand', () => {
  it('reads your amount words, glued or apart', () => {
    expect(q('kopi 25rebu')).toMatchObject({ amount: 25000, note: 'kopi', readAs: ['rebu → × 1.000'] });
    expect(q('kopi 25 rebu')).toMatchObject({ amount: 25000, note: 'kopi' });
    expect(q('sewa 2 jeti')).toMatchObject({ amount: 2000000, note: 'sewa' });
    expect(q('kopi 25rebu', EMPTY_TERMS).amount).toBeNull();
  });

  it('reads words that stand for a sum, with a count before them', () => {
    expect(q('parkir goceng')).toMatchObject({ amount: 5000, note: 'parkir', categoryId: 'transport', readAs: ['goceng → Rp 5.000'] });
    expect(q('2 ceban jajan')).toMatchObject({ amount: 20000, note: 'jajan', readAs: ['2 ceban → Rp 20.000'] });
  });

  it('reads your day words and money-in words', () => {
    expect(q('bakso 20rb semalem')).toMatchObject({ date: '2026-11-22', dateFrom: 'semalem', readAs: ['semalem → yesterday'] });
    expect(q('bensin 50rb sab').date).toBe('2026-11-21');
    expect(q('cair 3jt')).toMatchObject({ kind: 'in', categoryId: 'other-in', readAs: ['cair → money in'] });
  });

  it('keeps built-in words working beside yours', () => {
    expect(q('kopi 25rb kemarin')).toMatchObject({ amount: 25000, date: '2026-11-22', readAs: [] });
  });

  it('refuses words that already mean something else, or are not one word', () => {
    expect(validateWord('kemarin', 'unit', mine)).toBe('“kemarin” already means a day.');
    expect(validateWord('rb', 'unit', mine)).toBe('“rb” is already understood.');
    expect(validateWord('goceng', 'income', mine)).toBe('“goceng” already means a fixed amount in your shorthand.');
    expect(validateWord('25rb', 'fixed', mine)).toBe('Use letters only, as one word.');
    expect(validateWord('dua kata', 'fixed', mine)).toBe('Use letters only, as one word.');
    expect(validateWord('', 'day', mine)).toBe('Write a word.');
    expect(validateWord('gopek', 'fixed', mine)).toBeNull();
    expect(validateWord('goceng', 'fixed', mine)).toBeNull(); // same kind: an update
    expect(validateFixedAmount(null)).toMatch(/Write the amount/);
    expect(validateFixedAmount(500)).toBeNull();
  });

  it('keeps one meaning per word, and lets you remove it', () => {
    const moved = addTerm(mine, { kind: 'fixed', word: 'cair', amount: 1 });
    expect(moved.income).toEqual([]);
    expect(moved.fixed.map((f) => f.word)).toContain('cair');
    expect(meaningOf('cair', moved)).toBe('fixed');
    expect(meaningOf('semalem', removeTerm(mine, 'Semalem'))).toBeNull();
    expect(meaningOf('ribu', EMPTY_TERMS)).toBe('unit');
    expect(dayLabel({ daysAgo: 1 })).toBe('yesterday');
    expect(dayLabel({ weekday: 6 })).toBe('last Saturday');
    expect(BUILT_IN.units).toContain('rb');
  });
});
