import { useCallback, useEffect, useState } from 'react';
import { capsuleStatus } from '../../domain/capsule';
import { coordOf } from '../../domain/time';
import { TONES, TONE_LABEL, type Lens } from '../../domain/types';
import { formatMedium, formatNumber, ordinal } from '../../lib/format';
import { navigate, type Route } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Seal } from '../../components/ui/Seal';
import { useEditors } from '../editors/EditorsProvider';
import { LifelineCanvas } from './LifelineCanvas';
import { WeekPanel } from './WeekPanel';

const LENSES: { value: Lens; label: string }[] = [
  { value: 'moments', label: 'Moments' },
  { value: 'chapters', label: 'Chapters' },
  { value: 'plain', label: 'Plain' },
];

function useIsNarrow(query = '(max-width: 1099px)') {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return narrow;
}

export function LifelineView({ route }: { route: Route }) {
  const { profile, data, today, lifeline, almanac, dispatch } = useProfileStore();
  const editors = useEditors();
  const narrow = useIsNarrow();
  const param = Number(route.params.get('week'));
  const hasParam = route.params.has('week') && Number.isInteger(param) && param >= 0 && param < lifeline.total;
  const selected = hasParam ? param : lifeline.now;
  // On narrow screens the panel is a sheet that only appears once a week is chosen.
  const sheetOpen = narrow && hasParam;

  const select = useCallback((i: number) => navigate('lifeline', { week: i }, { replace: true }), []);
  const closeSheet = useCallback(() => navigate('lifeline', undefined, { replace: true }), []);

  const here = coordOf(lifeline.now);
  const ready = data.capsules.filter((c) => capsuleStatus(c, today) === 'ready');
  const firstReady = ready[0];
  const lens = data.settings.lens;

  return (
    <div className="lifeline-view">
      <header className="page-head lifeline-view__head">
        <p className="eyebrow rise">Your lifeline · {profile.horizonYears}-year horizon</p>
        <h1 className="display hero rise" style={{ ['--i' as string]: 1 }}>
          {profile.name}, this is week <em>{here.week + 1}</em> of your <em>{ordinal(here.age + 1)}</em>&nbsp;year.
        </h1>
        <dl className="stat-strip rise" style={{ ['--i' as string]: 2 }}>
          <div><dt>Weeks lived</dt><dd className="mono">{formatNumber(almanac.weeksLived)}</dd></div>
          <div><dt>Weeks ahead</dt><dd className="mono">{formatNumber(almanac.weeksRemaining)}</dd></div>
          <div><dt>Inscribed</dt><dd className="mono">{formatNumber(almanac.inscribedWeeks)}</dd></div>
          <div className="stat-strip__bar" aria-hidden="true"><span style={{ width: `${almanac.fractionLived * 100}%` }} /></div>
        </dl>
      </header>

      {firstReady && (
        <aside className="ready-banner rise" style={{ ['--i' as string]: 3 }} aria-live="polite">
          <Seal fingerprint={firstReady.fingerprint} initial={profile.name} size={44} />
          <p>
            <strong>{ready.length === 1 ? 'A letter is ready.' : `${ready.length} letters are ready.`}</strong>{' '}
            <span className="muted">You sealed “{firstReady.title}” on {formatMedium(firstReady.sealedOn)}.</span>
          </p>
          <Button variant="seal" size="s" onClick={() => editors.readCapsule(firstReady.id)}>Open it</Button>
        </aside>
      )}

      <div className="lifeline-view__body">
        <section className="lifeline-view__grid rise" style={{ ['--i' as string]: 3 }} aria-label="Lifeline">
          <div className="lifeline-toolbar">
            <Segmented label="Lens" options={LENSES} value={lens} onChange={(v) => dispatch({ type: 'settings/update', patch: { lens: v } })} />
            <Legend lens={lens} />
          </div>
          <LifelineCanvas model={lifeline} profile={profile} lens={lens} selected={selected} onSelect={select} />
        </section>

        {narrow ? (
          sheetOpen && (
            <div className="week-sheet" role="dialog" aria-modal="false" aria-label="Selected week">
              <WeekPanel index={selected} onMove={select} onClose={closeSheet} />
            </div>
          )
        ) : (
          <aside className="lifeline-view__panel">
            <WeekPanel index={selected} onMove={select} />
          </aside>
        )}
      </div>
    </div>
  );
}

function Legend({ lens }: { lens: Lens }) {
  const { data } = useProfileStore();
  return (
    <ul className="legend" aria-label="Legend">
      {lens === 'moments' &&
        TONES.map((t) => (
          <li key={t} className={`tone--${t}`}><span className="legend__cell" />{TONE_LABEL[t]}</li>
        ))}
      {lens === 'chapters' &&
        (data.chapters.length ? (
          [...data.chapters]
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((c) => (
              <li key={c.id} className={`ink--${c.ink}`}><span className="legend__cell" />{c.title}</li>
            ))
        ) : (
          <li className="legend__hint">
            <button type="button" className="link" onClick={() => navigate('chapters')}>Name your chapters</button> to colour your lifeline.
          </li>
        ))}
      {lens === 'plain' && (
        <>
          <li className="legend--lived"><span className="legend__cell" />Lived</li>
          <li className="legend--future"><span className="legend__cell" />Ahead</li>
        </>
      )}
      <li className="legend--now"><span className="legend__cell" />Now</li>
      <li className="legend--capsule"><span className="legend__ring" />Capsule</li>
    </ul>
  );
}
