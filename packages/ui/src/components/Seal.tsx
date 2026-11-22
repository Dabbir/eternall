import { useMemo } from 'react';

interface Props {
  fingerprint: string;
  initial: string;
  size?: number;
  broken?: boolean;
  className?: string;
  label?: string;
}

/** Deterministic byte stream from a hex fingerprint. */
function bytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out.length ? out : [128];
}

/**
 * A wax seal generated from the capsule's SHA-256 fingerprint:
 * every letter gets a unique rim, ring count and engraved rosette.
 */
export function Seal({ fingerprint, initial, size = 96, broken = false, className = '', label }: Props) {
  const geo = useMemo(() => {
    const b = bytes(fingerprint);
    const at = (i: number) => b[i % b.length]!;
    const points = 36;
    const rim: string[] = [];
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = 46 + ((at(i) / 255) * 3.2 - 1.6) + (i % 2 ? -0.6 : 0.6);
      rim.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
    }
    const petals = 6 + (at(40) % 7);
    const petalLen = 9 + (at(41) % 6);
    const rotation = (at(42) / 255) * 360;
    const rings = 1 + (at(43) % 2);
    const dots = 12 + (at(44) % 4) * 4;
    return { rim: `M${rim.join('L')}Z`, petals, petalLen, rotation, rings, dots };
  }, [fingerprint]);

  const letter = (initial.trim()[0] ?? 'E').toUpperCase();

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`seal ${broken ? 'is-broken' : ''} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`wax-${fingerprint.slice(0, 8)}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--accent-deep)" stopOpacity="1" />
        </radialGradient>
      </defs>
      <g className="seal__half seal__half--l">
        <SealBody geo={geo} letter={letter} fill={`url(#wax-${fingerprint.slice(0, 8)})`} clip="l" id={fingerprint.slice(0, 8)} />
      </g>
      <g className="seal__half seal__half--r">
        <SealBody geo={geo} letter={letter} fill={`url(#wax-${fingerprint.slice(0, 8)})`} clip="r" id={fingerprint.slice(0, 8)} />
      </g>
    </svg>
  );
}

function SealBody({
  geo,
  letter,
  fill,
  clip,
  id,
}: {
  geo: { rim: string; petals: number; petalLen: number; rotation: number; rings: number; dots: number };
  letter: string;
  fill: string;
  clip: 'l' | 'r';
  id: string;
}) {
  const clipId = `seal-clip-${clip}-${id}`;
  // A jagged crack down the middle splits the seal when broken.
  const crack = 'M50,0 L53,18 L47,31 L54,46 L46,58 L52,72 L48,86 L50,100';
  const clipPath = clip === 'l' ? `${crack} L0,100 L0,0 Z` : `${crack} L100,100 L100,0 Z`;
  return (
    <>
      <clipPath id={clipId}>
        <path d={clipPath} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={geo.rim} fill={fill} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="var(--on-accent)" strokeOpacity="0.28" strokeWidth="0.8" />
        {geo.rings > 1 && <circle cx="50" cy="50" r="33" fill="none" stroke="var(--on-accent)" strokeOpacity="0.18" strokeWidth="0.6" />}
        <g transform={`rotate(${geo.rotation} 50 50)`} stroke="var(--on-accent)" strokeOpacity="0.32" strokeWidth="0.7" fill="none">
          {Array.from({ length: geo.dots }, (_, i) => {
            const a = (i / geo.dots) * Math.PI * 2;
            return <circle key={`d${i}`} cx={50 + Math.cos(a) * 40.5} cy={50 + Math.sin(a) * 40.5} r="0.9" fill="var(--on-accent)" stroke="none" fillOpacity="0.4" />;
          })}
          {Array.from({ length: geo.petals }, (_, i) => (
            <path
              key={`p${i}`}
              transform={`rotate(${(i / geo.petals) * 360} 50 50)`}
              d={`M50,${50 - 20} q 3,-${geo.petalLen / 2} 0,-${geo.petalLen} q -3,${geo.petalLen / 2} 0,${geo.petalLen}`}
            />
          ))}
        </g>
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-display)"
          fontSize="30"
          fill="var(--on-accent)"
          fillOpacity="0.85"
          fontStyle="italic"
        >
          {letter}
        </text>
      </g>
    </>
  );
}
