import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { WEEKS_PER_ROW, coordOf, formatRange, weekRange, type HouseProfile } from '@eternall/core';
import type { LifelineModel } from '../domain/lifeline';
import type { Lens } from '../domain/house';
import { useThemeVersion } from '../../shell/theme';

interface Props {
  model: LifelineModel;
  profile: HouseProfile;
  lens: Lens;
  selected: number | null;
  onSelect?: (index: number) => void;
  /** 0–1: progress of the "drawing your life" reveal. */
  reveal?: number;
  interactive?: boolean;
  label?: string;
}

interface Geometry {
  width: number;
  height: number;
  pitch: number;
  cell: number;
  left: number;
  top: number;
  decadeGap: number;
  rows: number;
}

const DECADE = 10;

function computeGeometry(width: number, rows: number): Geometry {
  const left = width < 520 ? 22 : 34;
  const top = 20;
  const pitch = Math.max(4, Math.min(17, (width - left) / WEEKS_PER_ROW));
  const decadeGap = Math.round(pitch * 0.9);
  const decades = Math.floor((rows - 1) / DECADE);
  const height = top + rows * pitch + decades * decadeGap + 4;
  return { width, height, pitch, cell: Math.max(2.5, pitch * 0.76), left, top, decadeGap, rows };
}

const rowY = (g: Geometry, r: number) => g.top + r * g.pitch + Math.floor(r / DECADE) * g.decadeGap;
const colX = (g: Geometry, c: number) => g.left + c * g.pitch;

function hitTest(g: Geometry, x: number, y: number): number | null {
  const col = Math.floor((x - g.left) / g.pitch);
  if (col < 0 || col >= WEEKS_PER_ROW) return null;
  const block = g.pitch * DECADE + g.decadeGap;
  const yy = y - g.top;
  if (yy < 0) return null;
  const d = Math.floor(yy / block);
  const within = yy - d * block;
  if (within >= g.pitch * DECADE) return null;
  const row = d * DECADE + Math.floor(within / g.pitch);
  if (row >= g.rows) return null;
  return row * WEEKS_PER_ROW + col;
}

function readPalette(el: Element) {
  const s = getComputedStyle(el);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    future: v('--cell-future'),
    lived: v('--cell-lived'),
    plainLived: v('--cell-plain-lived'),
    seal: v('--seal'),
    ink3: v('--ink-3'),
    paper: v('--paper'),
    mono: v('--font-mono'),
    tone: {
      joy: v('--tone-joy'), calm: v('--tone-calm'), tender: v('--tone-tender'),
      bold: v('--tone-bold'), grief: v('--tone-grief'), wonder: v('--tone-wonder'),
    },
  };
}

function LifelineCanvasImpl({ model, profile, lens, selected, onSelect, reveal = 1, interactive = true, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const themeVersion = useThemeVersion();
  const rows = profile.horizonYears;
  const geo = useMemo(() => (width ? computeGeometry(width, rows) : null), [width, rows]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Paint.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geo) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(geo.width * dpr);
    canvas.height = Math.round(geo.height * dpr);
    canvas.style.width = `${geo.width}px`;
    canvas.style.height = `${geo.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, geo.width, geo.height);

    const pal = readPalette(canvas);
    const r = Math.min(2, geo.cell * 0.22);
    const drawCell = (x: number, y: number, fill: string, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, geo.cell, geo.cell, r);
      else ctx.rect(x, y, geo.cell, geo.cell);
      ctx.fill();
    };

    // Axis labels.
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.ink3;
    ctx.font = `500 ${geo.pitch < 9 ? 8.5 : 10}px ${pal.mono}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    const ageStep = geo.pitch < 9 ? 10 : 5;
    for (let row = 0; row < geo.rows; row += ageStep) {
      ctx.fillText(String(row), geo.left - 8, rowY(geo, row) + geo.cell / 2);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const w of [1, 13, 26, 39, 52]) {
      ctx.fillText(String(w), colX(geo, w - 1) + geo.cell / 2, geo.top - 8);
    }

    const livedLimit = Math.floor(model.now * reveal);
    const total = model.total;
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / WEEKS_PER_ROW);
      const col = i % WEEKS_PER_ROW;
      const x = colX(geo, col);
      const y = rowY(geo, row);
      const lived = i < livedLimit;
      const isNow = i === model.now && reveal >= 1;

      if (isNow) {
        drawCell(x, y, pal.seal);
        continue;
      }
      if (lens === 'plain') {
        drawCell(x, y, lived ? pal.plainLived : pal.future);
      } else if (lens === 'chapters') {
        const band = model.bands.get(i);
        if (band) drawCell(x, y, band.color, i < model.now ? (lived ? 1 : 0.3) : 0.32);
        else drawCell(x, y, lived ? pal.lived : pal.future, lived ? 0.55 : 1);
      } else {
        const tone = model.tones.get(i);
        if (tone && lived) drawCell(x, y, pal.tone[tone]);
        else drawCell(x, y, lived ? pal.lived : pal.future);
      }

      // Letter marks (future and past opening weeks).
      const marker = model.markers.get(i);
      const cap = marker === 'letter-sealed' ? 'sealed' : marker === 'letter-ready' ? 'ready' : marker === 'letter-opened' ? 'opened' : null;
      // Release-2 signals: a corner dot for a ritual kept, a person seen or a work finished; a notch for a season's edge.
      if (!cap && reveal >= 1 && (marker === 'ritual' || marker === 'person' || marker === 'work' || marker === 'season') && lens !== 'plain') {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = pal.ink3;
        if (marker === 'season') ctx.fillRect(x, y, Math.max(1, geo.cell * 0.18), geo.cell);
        else {
          ctx.beginPath();
          ctx.arc(x + geo.cell * 0.78, y + geo.cell * 0.78, Math.max(0.8, geo.cell * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (cap && reveal >= 1) {
        const cx = x + geo.cell / 2;
        const cy = y + geo.cell / 2;
        ctx.globalAlpha = 1;
        if (cap === 'sealed') {
          ctx.strokeStyle = pal.seal;
          ctx.lineWidth = Math.max(1, geo.cell * 0.16);
          ctx.beginPath();
          ctx.arc(cx, cy, geo.cell * 0.34, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = cap === 'ready' ? pal.seal : pal.paper;
          ctx.beginPath();
          ctx.arc(cx, cy, geo.cell * (cap === 'ready' ? 0.4 : 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }, [geo, model, lens, reveal, themeVersion]);

  const announce = useMemo(() => {
    const i = selected ?? model.now;
    const c = coordOf(i);
    const { start, end } = weekRange(profile.birthDate, c);
    const n = model.counts.get(i) ?? 0;
    const when = i < model.now ? 'lived' : i === model.now ? 'this week' : 'ahead';
    return `Age ${c.age}, week ${c.week + 1}: ${formatRange(start, end)}, ${when}${n ? `, ${n} ${n === 1 ? 'entry' : 'entries'}` : ''}.`;
  }, [selected, model, profile.birthDate]);

  const move = useCallback(
    (delta: number) => {
      const from = selected ?? model.now;
      onSelect?.(Math.max(0, Math.min(model.total - 1, from + delta)));
    },
    [selected, model, onSelect],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const cur = selected ?? model.now;
    const map: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => move(-WEEKS_PER_ROW),
      ArrowDown: () => move(WEEKS_PER_ROW),
      PageUp: () => move(-WEEKS_PER_ROW * DECADE),
      PageDown: () => move(WEEKS_PER_ROW * DECADE),
      Home: () => onSelect?.(cur - (cur % WEEKS_PER_ROW)),
      End: () => onSelect?.(cur - (cur % WEEKS_PER_ROW) + WEEKS_PER_ROW - 1),
      t: () => onSelect?.(model.now),
      Enter: () => onSelect?.(cur),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const pointerIndex = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !geo) return null;
    const rect = canvas.getBoundingClientRect();
    return hitTest(geo, clientX - rect.left, clientY - rect.top);
  };

  const box = (i: number | null) => {
    if (i === null || !geo) return null;
    const c = coordOf(i);
    return { left: colX(geo, c.week), top: rowY(geo, c.age), size: geo.cell };
  };
  const nowBox = reveal >= 1 ? box(model.now) : null;
  const selBox = box(selected);
  const hoverBox = interactive ? box(hover) : null;
  const hoverInfo = useMemo(() => {
    if (hover === null) return null;
    const c = coordOf(hover);
    const { start, end } = weekRange(profile.birthDate, c);
    return { title: `Age ${c.age} · Week ${c.week + 1}`, range: formatRange(start, end), n: model.counts.get(hover) ?? 0 };
  }, [hover, profile.birthDate, model]);

  return (
    <div
      ref={wrapRef}
      className={`lifeline ${interactive ? 'is-interactive' : ''} ${focused ? 'is-focused' : ''}`}
      style={{ height: geo?.height ?? 600 }}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'application' : 'img'}
      aria-roledescription="lifeline"
      aria-label={label ?? `Your life in weeks. ${announce} Use arrow keys to move between weeks, Page Up and Page Down to jump a decade, T for this week.`}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <canvas
        ref={canvasRef}
        className="lifeline__canvas"
        aria-hidden="true"
        onPointerMove={(e) => interactive && e.pointerType === 'mouse' && setHover(pointerIndex(e.clientX, e.clientY))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          if (!interactive) return;
          const i = pointerIndex(e.clientX, e.clientY);
          if (i !== null) onSelect?.(i);
        }}
      />
      {nowBox && <span className="lifeline__now" style={{ left: nowBox.left, top: nowBox.top, width: nowBox.size, height: nowBox.size }} aria-hidden="true" />}
      {selBox && (
        <span
          className="lifeline__sel"
          style={{ transform: `translate(${selBox.left}px, ${selBox.top}px)`, width: selBox.size, height: selBox.size }}
          aria-hidden="true"
        />
      )}
      {hoverBox && hoverInfo && hover !== selected && (
        <>
          <span className="lifeline__hover" style={{ left: hoverBox.left, top: hoverBox.top, width: hoverBox.size, height: hoverBox.size }} aria-hidden="true" />
          <span
            className={`lifeline__tip ${geo && hoverBox.left > geo.width * 0.62 ? 'is-left' : ''}`}
            style={{ left: hoverBox.left + hoverBox.size / 2, top: hoverBox.top }}
            aria-hidden="true"
          >
            <span className="mono">{hoverInfo.title}</span>
            <span>{hoverInfo.range}</span>
            {hoverInfo.n > 0 && <span className="lifeline__tip-n">{hoverInfo.n} {hoverInfo.n === 1 ? 'entry' : 'entries'}</span>}
          </span>
        </>
      )}
      {interactive && (
        <span className="visually-hidden" aria-live="polite">
          {focused ? announce : ''}
        </span>
      )}
    </div>
  );
}

export const LifelineCanvas = memo(LifelineCanvasImpl);
