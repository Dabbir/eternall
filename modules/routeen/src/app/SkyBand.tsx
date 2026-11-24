import type { CSSProperties, ReactNode } from 'react';
import type { Group } from '../front';
import type { Mode } from '../modes';
import { arcY, placeBodies } from '../placement';
import { BodyIcon, type BodyKind } from './Body';

/** Bodies are named on the sky only while they fit; past this the rows below name them. */
export const MAX_NAMED = 12;

const ARC = Array.from({ length: 49 }, (_, i) => {
  const x = i / 48;
  return `${(x * 1000).toFixed(1)},${(arcY(x) * 400).toFixed(1)}`;
}).join(' ');

/**
 * The day's sky as the page (ADR 0016): a band from edge to edge under the app bar, the arc from
 * horizon to horizon, the sun where the day stands, and every practice as a body at its own place
 * (`placeBodies`). Lighting changes a body in place; `glow` (0..1) brightens the sky as the day fills,
 * never shown as a number. The weather (☁︎ low energy, ✦ day off) lies over the whole band.
 * The picture is one `role="img"` named in words; the bodies are hidden and never focusable — the rows
 * below are the way to act. `children` (headline, mode) sit on the sky, outside the picture.
 */
export function SkyBand({
  size,
  mode,
  glow,
  groups = [],
  kindOf = () => 'unlit',
  nameOf = () => '',
  sun,
  label,
  justLit = null,
  children,
}: {
  size: 'full' | 'short' | 'small';
  mode: Mode;
  glow: number;
  groups?: readonly Group[];
  kindOf?(id: string): BodyKind;
  nameOf?(id: string): string;
  sun?: number;
  label: string;
  justLit?: string | null;
  children?: ReactNode;
}) {
  const placed = placeBodies(groups);
  const named = placed.length <= MAX_NAMED;
  const sunX = sun === undefined ? null : 0.04 + 0.92 * Math.min(1, Math.max(0, sun));
  const at = (x: number, y: number) => ({ left: `${(x * 100).toFixed(2)}%`, top: `${(y * 100).toFixed(2)}%` });
  return (
    <section className={`rs-band rs-band--${size} rs-mode--${mode}`} style={{ '--glow': Math.min(1, Math.max(0, glow)).toFixed(3) } as CSSProperties}>
      {children && <div className="rs-band__head">{children}</div>}
      <div className="rs-band__sky">
        <svg className="rs-band__arc" role="img" aria-label={label} viewBox="0 0 1000 400" preserveAspectRatio="none">
          <polyline className="rs-band__path" points={ARC} fill="none" />
          <line className="rs-band__horizon" x1="0" y1="400" x2="1000" y2="400" />
        </svg>
        <div className="rs-band__bodies" aria-hidden="true">
          {sunX !== null && (
            <span className="rs-body rs-body--sun" style={at(sunX, arcY(sunX))}>
              <BodyIcon kind="sun" />
            </span>
          )}
          {placed.map((b) => {
            const kind = mode === 'off' && kindOf(b.id) === 'unlit' ? 'rest' : kindOf(b.id);
            return (
              <span key={b.id} data-id={b.id} data-kind={kind} className={`rs-body rs-body--${kind}${b.labelAbove ? ' is-label-above' : ''}${justLit === b.id ? ' is-lighting' : ''}`} style={at(b.x, b.y)}>
                <BodyIcon kind={kind} />
                {named && <span className="rs-body__name">{nameOf(b.id)}</span>}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
