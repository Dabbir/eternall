/**
 * The day's arc (spec §4.3): a thin curve from the day's start to its end, with the sun standing at
 * `position` (0 at the start, towards 1 at the end; `sunPosition`). Decorative: the headline says the same.
 */
export function SunArc({ position }: { position: number }) {
  const t = Math.min(1, Math.max(0, position));
  const x = 50 - 44 * Math.cos(Math.PI * t);
  const y = 48 - 40 * Math.sin(Math.PI * t);
  return (
    <svg className="rs-arc" viewBox="0 0 100 52" aria-hidden="true" focusable="false">
      <path className="rs-arc__path" d="M 6 48 A 44 40 0 0 1 94 48" fill="none" />
      <line className="rs-arc__horizon" x1="0" y1="48" x2="100" y2="48" />
      <circle className="rs-arc__sun" cx={x.toFixed(2)} cy={y.toFixed(2)} r="4" />
    </svg>
  );
}
