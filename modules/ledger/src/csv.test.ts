import { csvAmount, csvDate, parseCsv, readRows } from './csv';

describe('csv import', () => {
  it('reads commas, semicolons and quotes', () => {
    expect(parseCsv('a,b\n"x, y",2\n')).toEqual([['a', 'b'], ['x, y', '2']]);
    expect(parseCsv('Tanggal;Ket;Jumlah\r\n01/11/2026;"Kopi ""Tuku""";-25.000')).toEqual([['Tanggal', 'Ket', 'Jumlah'], ['01/11/2026', 'Kopi "Tuku"', '-25.000']]);
  });

  it('reads dates day first, and signed amounts', () => {
    expect(csvDate('01/11/2026')).toBe('2026-11-01');
    expect(csvDate('1-11-26')).toBe('2026-11-01');
    expect(csvDate('2026-11-01 08:00')).toBe('2026-11-01');
    expect(csvDate('31/02/2026')).toBeNull();
    expect(csvAmount('-25.000')).toEqual({ amount: 25000, kind: 'out' });
    expect(csvAmount('25.000 DB')).toEqual({ amount: 25000, kind: 'out' });
    expect(csvAmount('(25.000)')).toEqual({ amount: 25000, kind: 'out' });
    expect(csvAmount('8,000,000.00 CR')).toEqual({ amount: 8000000, kind: 'in' });
    expect(csvAmount('IDR 1.250.000,00')).toEqual({ amount: 1250000, kind: 'in' });
    expect(csvAmount('abc')).toBeNull();
  });

  it('turns mapped rows into entries and counts what it skipped', () => {
    const rows = parseCsv('Date,Note,Amount\n01/11/2026,Kopi,-25000\n02/11/2026,Gaji,8000000\nbad,x,1\n');
    const m = { date: 0, amount: 2, note: 1, allOut: false, header: true };
    expect(readRows(rows, m)).toEqual({
      ok: [
        { date: '2026-11-01', amount: 25000, kind: 'out', note: 'Kopi' },
        { date: '2026-11-02', amount: 8000000, kind: 'in', note: 'Gaji' },
      ],
      skipped: 1,
    });
    expect(readRows(rows, { ...m, allOut: true }).ok[1]!.kind).toBe('out');
  });
});
