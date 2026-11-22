/**
 * The AMAZEEN monogram: an editorial A with a swash foot and a four-point star for its counter.
 * The star is cut out (even-odd fill), so the mark sits cleanly on any background and inherits
 * `color`. Source geometry lives in scripts/logo/build_logo.py; keep the two in sync.
 */
export const MONOGRAM_PATH =
  'M0 65.3 C11.3 60.2 20.6 50.6 27.4 38.7 L50 0 L65.3 0 L100 65.3 L67.8 65.3 L59.9 49.2 L39.8 49.2 ' +
  'C35.6 49.2 31.6 52.8 30.8 57.1 C30.2 61 33.6 63.8 39.5 65.3 Z ' +
  'M52.5 17.5 L54.8 27 L62.1 29.9 L54.8 32.9 L52.5 42.4 L50.3 32.9 L42.9 29.9 L50.3 27 Z';

interface MonogramProps {
  className?: string | undefined;
  /** Accessible name. Omit when the mark sits next to visible text (it's then decorative). */
  title?: string;
}

export function Monogram({ className, title }: MonogramProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 65.3"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path fillRule="evenodd" d={MONOGRAM_PATH} />
    </svg>
  );
}
