/**
 * The ETERNALL logotype: a monoline engraved face whose final L runs on toward a seal —
 * a line that keeps going. Drawn as strokes so it scales crisply and inherits colour.
 */
const LETTERS = [
  'M0 0V14M0 0H9M0 7H7.5M0 14H9', // E
  'M14 0H24M19 0V14', // T
  'M29 0V14M29 0H38M29 7H36.5M29 14H38', // E
  'M43 14V0H48.5A3.5 3.5 0 0 1 48.5 7H43M48 7L52.5 14', // R
  'M57.5 14V0L66.5 14V0', // N
  'M71.5 14L76.5 0L81.5 14M73.6 8.6H79.4', // A
  'M86.5 0V14H94.5', // L
  'M99.5 0V14H118', // L — the long stroke
];

export function Wordmark({ height = 16, title = 'ETERNALL' }: { height?: number; title?: string }) {
  return (
    <svg
      className="wordmark"
      viewBox="-1 -1 126 16"
      height={height}
      width={(height * 126) / 16}
      role="img"
      aria-label={title}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
        {LETTERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle className="wordmark__seal" cx="121.6" cy="14" r="2.1" fill="var(--seal)" />
    </svg>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="logomark">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d="M10.5 8.5V22.5H18.4" fill="none" stroke="var(--paper)" strokeWidth="2.4" strokeLinecap="square" />
      <circle cx="23.6" cy="22.5" r="2.6" fill="var(--seal)" />
    </svg>
  );
}
