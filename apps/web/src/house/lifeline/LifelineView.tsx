import { useCallback, useEffect, useMemo, useState } from 'react';
import { TONES, TONE_LABEL, coordOf, formatNumber, ordinal, type ContributionContext, type ImprintDefinition } from '@eternall/core';
import { usePrimaryAction } from '@eternall/kit';
import { Button, Segmented } from '@eternall/ui';
import type { Lens } from '../domain/house';
import { buildLifeline } from '../domain/lifeline';
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
          <LifelineCanvas model={model} profile={profile} lens={lens} selected={selected} onSelect={select} />
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
