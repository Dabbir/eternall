/**
 * The sky's shapes, drawn (ADR 0015, 0016): the shape carries the meaning, colour only supports it.
 * A ring is unlit; ◐ a half disc is a little; ☀︎ a full disc is as planned; ✺ a disc with rays is more;
 * ✦ a four-point star is a day off; the sun is the day's own, larger and glowing (CSS).
 * Drawn as SVG so the shapes stay crisp at any size, from the year's 14px cells to the sky.
 */
export type BodyKind = 'unlit' | 'minimum' | 'target' | 'more' | 'rest' | 'sun';

const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

/** The shape centred on 0,0 in a 24-unit box; fills and strokes use currentColor. */
export function BodyShape({ kind }: { kind: BodyKind }) {
  switch (kind) {
    case 'unlit':
      return <circle className="rs-shape__ring" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />;
    case 'minimum':
      return (
        <>
          <circle r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M 0 -7 A 7 7 0 0 0 0 7 Z" fill="currentColor" />
        </>
      );
    case 'target':
      return <circle r="7.8" fill="currentColor" />;
    case 'more':
      return (
        <>
          <circle r="6" fill="currentColor" />
          {RAYS.map((a) => (
            <line key={a} x1={(8 * Math.cos(a)).toFixed(2)} y1={(8 * Math.sin(a)).toFixed(2)} x2={(11 * Math.cos(a)).toFixed(2)} y2={(11 * Math.sin(a)).toFixed(2)} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ))}
        </>
      );
    case 'rest':
      return <path d="M 0 -8 Q 1.2 -1.2 8 0 Q 1.2 1.2 0 8 Q -1.2 1.2 -8 0 Q -1.2 -1.2 0 -8 Z" fill="currentColor" />;
    case 'sun':
      return <circle className="rs-shape__sun" r="9.5" fill="currentColor" />;
  }
}

/** A shape as its own small picture, always decorative: the words beside it say the same. Without `size`, CSS sizes it. */
export function BodyIcon({ kind, size, className }: { kind: BodyKind; size?: number; className?: string }) {
  return (
    <svg className={`rs-shape rs-shape--${kind}${className ? ` ${className}` : ''}`} width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <BodyShape kind={kind} />
    </svg>
  );
}
