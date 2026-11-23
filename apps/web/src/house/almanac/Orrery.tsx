import { useEffect, useState } from 'react';

/**
 * Plate I: an engraved orrery (docs/design/archive/almanack.md §6). The sun at the centre; decades lived as
 * solid orbits and decades ahead as dotted ones; the current year a planet on its orbit, with the
 * moon in today's phase beside it. Hatched line art only, no fills, like an engraving.
 */
export function Orrery({ fraction, decades, moonPhase, label }: { fraction: number | null; decades: number; moonPhase: number; label: string }) {
  const [t, setT] = useState(() => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 0));
  useEffect(() => {
    if (t >= 1) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / 1200);
      setT(1 - Math.pow(1 - x, 3));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const C = 160;
  const rings = Math.max(3, Math.min(12, decades));
  const rFor = (i: number) => 22 + (i + 1) * ((C - 30) / rings);
  const f = fraction ?? 0.5;
  const livedRings = fraction === null ? rings : Math.round(f * rings);
  const ring = Math.max(0, Math.min(rings - 1, Math.floor(f * rings)));
  const angle = (-90 + 360 * ((f * rings) % 1) * t) * (Math.PI / 180);
  const pr = rFor(ring);
  const px = C + Math.cos(angle) * pr;
  const py = C + Math.sin(angle) * pr;
  const mx = px + Math.cos(angle + 1.2) * 16;
  const my = py + Math.sin(angle + 1.2) * 16;
  // Moon phase 0 = new, 0.5 = full: shade with an offset circle.
  const lit = Math.cos(moonPhase * 2 * Math.PI);

  return (
    <svg className="alm-orrery" viewBox={`0 0 ${C * 2} ${C * 2}`} role="img" aria-label={label}>
      <defs>
        <pattern id="alm-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="currentColor" strokeWidth="0.6" />
        </pattern>
      </defs>
      {Array.from({ length: rings }, (_, i) => (
        <circle key={i} cx={C} cy={C} r={rFor(i)} fill="none" stroke="currentColor" strokeWidth={i < livedRings ? 0.9 : 0.6} strokeDasharray={i < livedRings ? undefined : '1.5 3.5'} opacity={i < livedRings ? 0.85 : 0.5} />
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <line key={i} x1={C + Math.cos(a) * (C - 8)} y1={C + Math.sin(a) * (C - 8)} x2={C + Math.cos(a) * (C - (i % 6 === 0 ? 18 : 12))} y2={C + Math.sin(a) * (C - (i % 6 === 0 ? 18 : 12))} stroke="currentColor" strokeWidth="0.7" />;
      })}
      <circle cx={C} cy={C} r={C - 4} fill="none" stroke="currentColor" strokeWidth="1.2" />
      {/* sun */}
      <circle cx={C} cy={C} r="13" fill="url(#alm-hatch)" stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={C + Math.cos(a) * 16} y1={C + Math.sin(a) * 16} x2={C + Math.cos(a) * 22} y2={C + Math.sin(a) * 22} stroke="currentColor" strokeWidth="0.8" />;
      })}
      {/* arm */}
      <line x1={C} y1={C} x2={px} y2={py} stroke="currentColor" strokeWidth="0.8" />
      {/* the year: a planet */}
      <circle cx={px} cy={py} r="7" className="alm-orrery__planet" stroke="currentColor" strokeWidth="1" />
      {/* the moon, today's phase */}
      <circle cx={mx} cy={my} r="4.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <clipPath id="alm-moon">
        <circle cx={mx} cy={my} r="4.5" />
      </clipPath>
      <circle cx={mx + lit * 4.5} cy={my} r="4.5" fill="url(#alm-hatch)" clipPath="url(#alm-moon)" />
    </svg>
  );
}
