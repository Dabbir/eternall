import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { TONES, TONE_LABEL, coordOf, formatNumber, ordinal, type ContributionContext, type ImprintDefinition } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { DimensionToggle, Stage3D, themeColors } from '@eternall/stage';
import { useThemeVersion } from '../../shell/theme';
import type { CoilProps } from './coilScene';
import { Button, Segmented } from '@eternall/ui';
import type { Lens } from '../domain/house';
import { buildLifeline, type LifelineModel } from '../domain/lifeline';
import { useSettings } from '../../shell/hooks';
import { linkProps, navigate } from '../../shell/router';
import { LifelineCanvas } from './LifelineCanvas';
import { WeekPanel } from './WeekPanel';

const LENSES: { value: Lens; label: string }[] = [
  { value: 'moments', label: 'Moments' },
  { value: 'chapters', label: 'Chapters' },
  { value: 'plain', label: 'Plain' },
];

function useIsNarrow(query = '(max-width: 1099px)') {
  const [narrow, setNarrow] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return narrow;
}

export function LifelineView({ ctx, enabled, search }: { ctx: ContributionContext; enabled: readonly ImprintDefinition[]; search: URLSearchParams }) {
  const profile = ctx.profile!;
  const [settings, updateSettings] = useSettings();
  const layers = useMemo(() => enabled.map((d) => d.lifeline?.(ctx) ?? {}), [enabled, ctx]);
  const model = useMemo(() => buildLifeline(ctx, layers)!, [ctx, layers]);
  const narrow = useIsNarrow();
  const param = Number(search.get('week'));
  const hasParam = search.has('week') && Number.isInteger(param) && param >= 0 && param < model.total;
  const selected = hasParam ? param : model.now;
  const sheetOpen = narrow && hasParam;

  const select = useCallback((i: number) => navigate(`/?week=${i}`, { replace: true }), []);
  const closeSheet = useCallback(() => navigate('/', { replace: true }), []);
  usePrimaryAction({ label: 'Inscribe this week', run: () => navigate(`/inscriptions?new=1&date=${ctx.today}`) });

  const house = useHouse();
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');
  const view = house.immersive.allowed ? dimension : '2d';

  const here = coordOf(model.now);
  const lived = model.now;
  const ahead = model.total - model.now;
  const waiting = enabled.map((d) => ({ d, badge: d.badge?.(ctx) ?? null })).filter((x) => x.badge && x.d.id === 'envoi');
  const lens = settings.lens;
  const chapters = [...new Map([...model.bands.values()].map((b) => [b.label, b.color])).entries()];

  return (
    <div className="lifeline-view">
      <header className="page-head lifeline-view__head">
        <p className="eyebrow rise">Your lifeline · {profile.horizonYears}-year horizon</p>
        <h1 className="display hero rise" style={{ ['--i' as string]: 1 }}>
          {profile.name}, this is week <em>{here.week + 1}</em> of your <em>{ordinal(here.age + 1)}</em>&nbsp;year.
        </h1>
        <dl className="stat-strip rise" style={{ ['--i' as string]: 2 }}>
          <div>
            <dt>Weeks lived</dt>
            <dd className="mono">{formatNumber(lived)}</dd>
          </div>
          <div>
            <dt>Weeks ahead</dt>
            <dd className="mono">{formatNumber(ahead)}</dd>
          </div>
          <div>
            <dt>Weeks kept</dt>
            <dd className="mono">{formatNumber(model.counts.size)}</dd>
          </div>
          <div className="stat-strip__bar" aria-hidden="true">
            <span style={{ width: `${(lived / model.total) * 100}%` }} />
          </div>
        </dl>
      </header>

      {waiting.map(({ d, badge }) => (
        <aside key={d.id} className="ready-banner rise" style={{ ['--i' as string]: 3 }} aria-live="polite">
          <span className="ready-banner__mark" aria-hidden="true" />
          <p>
            <strong>{d.name}</strong> <span className="muted">· {badge}.</span>
          </p>
          <Button variant="accent" size="s" onClick={() => navigate(d.basePath)}>
            Open {d.name}
          </Button>
        </aside>
      ))}

      <div className="lifeline-view__body">
        <section className="lifeline-view__grid rise" style={{ ['--i' as string]: 3 }} aria-label="Lifeline">
          <div className="lifeline-toolbar">
            <Segmented label="Lens" options={LENSES} value={lens} onChange={(v) => updateSettings({ lens: v })} />
            <DimensionToggle value={view} onChange={setDimension} allowed={house.immersive.allowed} reason={house.immersive.reason} label3d="3D coil" />
            <ul className="legend" aria-label="Legend">
              {lens === 'moments' &&
                TONES.map((t) => (
                  <li key={t} className={`tone--${t}`}>
                    <span className="legend__cell" />
                    {TONE_LABEL[t]}
                  </li>
                ))}
              {lens === 'chapters' &&
                (chapters.length ? (
                  chapters.map(([label, color]) => (
                    <li key={label} style={{ ['--c' as string]: color }}>
                      <span className="legend__cell" />
                      {label}
                    </li>
                  ))
                ) : (
                  <li className="legend__hint">
                    <a className="link" {...linkProps('/folio/')}>
                      Name your chapters in FOLIO
                    </a>{' '}
                    to colour your lifeline.
                  </li>
                ))}
              {lens === 'plain' && (
                <>
                  <li className="legend--lived">
                    <span className="legend__cell" />
                    Lived
                  </li>
                  <li className="legend--future">
                    <span className="legend__cell" />
                    Ahead
                  </li>
                </>
              )}
              <li className="legend--now">
                <span className="legend__cell" />
                Now
              </li>
              <li className="legend--capsule">
                <span className="legend__ring" />
                Letter
              </li>
            </ul>
          </div>
          {view === '3d' ? (
            <Coil model={model} lens={lens} selected={selected} onSelect={select} onDowngrade={() => {
              setDimension('2d');
              house.toast({ message: 'This device couldn’t keep up with 3D, so the lifeline is back on the flat page.' });
            }} />
          ) : (
            <LifelineCanvas model={model} profile={profile} lens={lens} selected={selected} onSelect={select} />
          )}
        </section>

        {narrow ? (
          sheetOpen && (
            <div className="week-sheet" role="dialog" aria-modal="false" aria-label="Selected week">
              <WeekPanel index={selected} model={model} ctx={ctx} enabled={enabled} onMove={select} onClose={closeSheet} />
            </div>
          )
        ) : (
          <aside className="lifeline-view__panel">
            <WeekPanel index={selected} model={model} ctx={ctx} enabled={enabled} onMove={select} />
          </aside>
        )}
      </div>
    </div>
  );
}

const loadCoil = () => import('./coilScene');
const TONE_VARS = ['tone-joy', 'tone-calm', 'tone-tender', 'tone-bold', 'tone-grief', 'tone-wonder'] as const;

/** The life coil, sharing the flat page's model, lens, selection and keyboard. */
function Coil({ model, lens, selected, onSelect, onDowngrade }: { model: LifelineModel; lens: Lens; selected: number; onSelect(i: number): void; onDowngrade(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeVersion();
  const [palette, setPalette] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (ref.current) setPalette(themeColors(ref.current, ['ink', 'seal', 'cell-future', 'cell-lived', 'cell-plain-lived', ...TONE_VARS]));
  }, [theme]);

  const colors = useMemo(() => {
    if (!palette) return [];
    const out: string[] = [];
    for (let i = 0; i < model.total; i++) {
      const lived = i < model.now;
      if (i === model.now) out.push(palette.seal!);
      else if (lens === 'plain') out.push(lived ? palette['cell-plain-lived']! : palette['cell-future']!);
      else if (lens === 'chapters') out.push(model.bands.get(i)?.color ?? (lived ? palette['cell-lived']! : palette['cell-future']!));
      else {
        const tone = model.tones.get(i);
        out.push(tone && lived ? palette[`tone-${tone}`]! : lived ? palette['cell-lived']! : palette['cell-future']!);
      }
    }
    return out;
  }, [palette, model, lens]);

  const props = useMemo<CoilProps | null>(
    () => (palette ? { rows: model.total / 52, now: model.now, colors, selected, ink: palette.ink!, paper: palette.paper!, seal: palette.seal!, onSelect } : null),
    [palette, model, colors, selected, onSelect],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -52, ArrowDown: 52, PageUp: -520, PageDown: 520 };
    if (e.key === 't') return onSelect(model.now);
    const d = step[e.key];
    if (d === undefined) return;
    e.preventDefault();
    onSelect(Math.max(0, Math.min(model.total - 1, selected + d)));
  };

  const c = coordOf(selected);
  return (
    <div ref={ref} className="coil" tabIndex={0} onKeyDown={onKeyDown} aria-label={`Life coil. Selected: age ${c.age}, week ${c.week + 1}. Arrow keys move between weeks; Page Up and Page Down jump a decade; T returns to this week.`}>
      {props && <Stage3D load={loadCoil} props={props} label="Your life in weeks, wound into a coil — one turn per year." onDowngrade={onDowngrade} className="coil__stage" />}
      <p className="coil__hint" aria-hidden="true">Drag to turn · scroll to travel · click a week</p>
    </div>
  );
}
