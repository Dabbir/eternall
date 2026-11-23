import { formatRupiah } from '../money';

/**
 * CASHEEN's full-screen moment (docs/design/casheen.md §6): "Entered". The amount is written out in
 * the book's figures, digit by digit, and ruled off with a double line in red pen (green ink for
 * money in). Short and see-through, so the next line can be typed while it plays.
 */
export function Entered({ amount, kind, label }: { amount: number; kind: 'in' | 'out'; label: string }) {
  const text = formatRupiah(amount);
  return (
    <div className={`lr-entered is-${kind}`}>
      <div className="lr-entered__sum" style={{ ['--chars' as string]: text.length }}>
        <span className="lr-entered__figure">{text}</span>
        <span className="lr-entered__rule" />
      </div>
      <p className="lr-entered__label">{label}</p>
    </div>
  );
}
