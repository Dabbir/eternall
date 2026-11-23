/**
 * Rupiah, whole numbers only (docs/design/casheen.md §Money). Parsing accepts the ways people
 * actually type amounts: "25000", "25.000", "25rb", "25 ribu", "25k", "1,5jt", "2 juta", "Rp 25.000".
 */
export const MAX_AMOUNT = 1_000_000_000_000;

const MULT: Record<string, number> = { k: 1e3, rb: 1e3, ribu: 1e3, jt: 1e6, juta: 1e6 };

/** One amount token (with an optional unit) → rupiah, or null when it isn't an amount. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/^rp\.?\s*/u, '').replace(/\s+/gu, '');
  const m = /^(\d+(?:[.,]\d+)*)(k|rb|ribu|jt|juta)?$/u.exec(s);
  if (!m) return null;
  const [, num, unit] = m as unknown as [string, string, string | undefined];
  let value: number;
  if (unit) {
    // With a unit, one separator is a decimal point: "1,5jt", "1.5jt", "2,25rb".
    const parts = num.split(/[.,]/u);
    if (parts.length > 2) return null;
    value = Number(parts.join('.')) * MULT[unit]!;
  } else if (/^\d{1,3}([.,]\d{3})+$/u.test(num)) {
    value = Number(num.replace(/[.,]/gu, ''));
  } else if (/^\d+$/u.test(num)) {
    value = Number(num);
  } else {
    return null; // "25,5" without a unit: rupiah have no cents
  }
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded > 0 && rounded <= MAX_AMOUNT ? rounded : null;
}

/** "25.000" (Indonesian grouping, no currency). */
export function formatPlain(n: number): string {
  const sign = n < 0 ? '−' : '';
  return sign + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/gu, '.');
}

/** "Rp 25.000", "−Rp 25.000". */
export function formatRupiah(n: number): string {
  return n < 0 ? `−Rp ${formatPlain(-n)}` : `Rp ${formatPlain(n)}`;
}

/** "25rb", "1,5jt": the short form people say, used in quick chips. */
export function formatShort(n: number): string {
  if (n >= 1e6 && n % 1e5 === 0) return `${String(n / 1e6).replace('.', ',')}jt`;
  if (n >= 1e3 && n % 100 === 0) return `${String(n / 1e3).replace('.', ',')}rb`;
  return formatPlain(n);
}
