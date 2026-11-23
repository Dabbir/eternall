import { G, STEP } from './glyphs';

/**
 * REFRAIN's full-screen moment (docs/design/refrain.md §Ceremony): a held note. Five hairlines draw
 * across the screen, the ritual's note drops onto its own pitch, and a fermata holds it. When every
 * ritual due today is kept, the staff ends with the final double bar and "Fine". Silent: REFRAIN
 * never plays sound on its own.
 */
export function HeldNote({ name, pitch, fine }: { name: string; pitch: number; fine: boolean }) {
  const step = STEP[pitch] ?? 0;
  const y = 70 - step * 5;
  return (
    <div className="rr-held">
      <svg className="rr-held__staff" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
        {[30, 40, 50, 60, 70].map((ly, i) => (
          <line key={ly} x1="0" x2="400" y1={ly} y2={ly} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
        <text x="6" y="60" className="rf-glyph rr-held__clef">{G.clef}</text>
        <text x="190" y={y} className="rf-glyph rr-held__note">{G.note}</text>
        <text x="186" y={Math.min(y - 30, 22)} className="rf-glyph rr-held__fermata">{G.fermata}</text>
        {fine && (
          <g className="rr-held__final">
            <line x1="384" x2="384" y1="30" y2="70" />
            <rect x="389" y="30" width="5" height="40" />
          </g>
        )}
      </svg>
      <p className="rr-held__name">
        <em>{name}</em> · kept{fine ? ' · Fine' : ''}
      </p>
    </div>
  );
}
