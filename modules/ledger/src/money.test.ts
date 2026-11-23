import { formatPlain, formatRupiah, formatShort, parseAmount } from './money';

describe('money', () => {
  it('reads amounts the way people type them', () => {
    expect(parseAmount('25000')).toBe(25000);
    expect(parseAmount('25.000')).toBe(25000);
    expect(parseAmount('25,000')).toBe(25000);
    expect(parseAmount('1.250.000')).toBe(1250000);
    expect(parseAmount('25rb')).toBe(25000);
    expect(parseAmount('25 rb')).toBe(25000);
    expect(parseAmount('25ribu')).toBe(25000);
    expect(parseAmount('25k')).toBe(25000);
    expect(parseAmount('32,5rb')).toBe(32500);
    expect(parseAmount('1,5jt')).toBe(1500000);
    expect(parseAmount('1.5jt')).toBe(1500000);
    expect(parseAmount('2 juta')).toBe(2000000);
    expect(parseAmount('Rp 25.000')).toBe(25000);
    expect(parseAmount('rp25000')).toBe(25000);
  });

  it('refuses what is not a rupiah amount', () => {
    expect(parseAmount('kopi')).toBeNull();
    expect(parseAmount('25,5')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('1/11')).toBeNull();
    expect(parseAmount('1.2.3jt')).toBeNull();
    expect(parseAmount('9999999jt')).toBeNull();
  });

  it('writes rupiah with Indonesian grouping', () => {
    expect(formatPlain(1250000)).toBe('1.250.000');
    expect(formatRupiah(25000)).toBe('Rp 25.000');
    expect(formatRupiah(-50000)).toBe('−Rp 50.000');
    expect(formatShort(25000)).toBe('25rb');
    expect(formatShort(32500)).toBe('32,5rb');
    expect(formatShort(1500000)).toBe('1,5jt');
    expect(formatShort(1234)).toBe('1.234');
  });
});
