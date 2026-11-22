import type { Mood } from '../domain/types';

const PATHS = {
  star: 'M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  palette: 'M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2-.5-1.3.4-2.6 1.8-2.6H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3zM7.5 12h.01M10 7.5h.01M15 7.5h.01',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  desk: 'M3 10h18M5 10v10M19 10v10M8 6h8l1 4H7z',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string | undefined;
}

/** Decorative stroke icon. Always pair with visible text or an aria-label on the parent control. */
export function Icon({ name, size = 18, filled = false, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

const CLOUD = 'M7.5 18.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 10.4 4.05 4.05 0 0 0 7.5 18.5z';

/** Hand-drawn style weather glyph for a mood (1 storm … 5 sunny). */
export function WeatherIcon({ mood, size = 22, className }: { mood: Mood; size?: number; className?: string | undefined }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {mood === 5 && (
        <>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </>
      )}
      {mood === 4 && (
        <>
          <path d="M15.5 3.2v1.4M20.8 8.5h-1.4M19.3 4.7l-1 1M11.8 4.7l1 1" />
          <path d="M12.9 8.6a3.2 3.2 0 0 1 5.6 2.8" />
          <path d="M6.5 19h8a3.2 3.2 0 0 0 .3-6.4 4.7 4.7 0 0 0-9-.5A3.5 3.5 0 0 0 6.5 19z" />
        </>
      )}
      {mood === 3 && (
        <>
          <path d={CLOUD} />
          <path d="M16 6.5a4 4 0 0 1 4.5 3.5" opacity={0.55} />
        </>
      )}
      {mood === 2 && (
        <>
          <path d="M7.5 14.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 6.4 4.05 4.05 0 0 0 7.5 14.5z" />
          <path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" />
        </>
      )}
      {mood === 1 && (
        <>
          <path d="M7.5 14.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 6.4 4.05 4.05 0 0 0 7.5 14.5z" />
          <path d="M12.8 13.5l-2.3 3.8h3l-2.2 4" />
        </>
      )}
    </svg>
  );
}
