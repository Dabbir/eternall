import '@fontsource/abril-fatface/latin-400.css';
import '@fontsource/special-elite/latin-400.css';
import '@fontsource/libre-baskerville/latin-400.css';
import '@fontsource/libre-baskerville/latin-400-italic.css';
import '@fontsource/libre-baskerville/latin-700.css';
import '../theme/prologue.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, diffDays, formatLong, formatMedium, plural, type ImprintAppProps } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Icon } from '@eternall/ui';
import { DimensionToggle, Stage3D, themeColors } from '@eternall/stage';
import { useCollection } from '@eternall/vault';
import { HOPE_PATH, SEASON_PATH, STATE_HINT, STATE_LABEL, canClose, currentSeason, daysRemaining, inRehearsal, hopesOf, isOverdue, roman, sortSeasons, type Hope, type Season } from '../seasons';
import { EpilogueView, HopeEditor, SeasonEditor } from './Editors';
import type { CurtainProps } from './curtainScene';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function PrologueApp({ path }: ImprintAppProps) {
  const house = useHouse();
  const { items: seasons } = useCollection<Season>(SEASON_PATH);
  const { items: hopes } = useCollection<Hope>(HOPE_PATH);
  const season = currentSeason(seasons, house.today);
  const [editing, setEditing] = useState<null | { kind: 'hope'; existing?: Hope } | { kind: 'season'; existing?: Season }>(null);
  const playbill = /^\/playbill\/([A-Za-z0-9_-]+)$/.exec(path);
  const full = season ? hopesOf(hopes, season.id).length >= 7 : false;
  usePrimaryAction(season ? { label: 'Add a hope', run: () => (full ? house.toast({ message: 'A season holds only a few acts. Seven is the most.' }) : setEditing({ kind: 'hope' })) } : { label: 'Begin this season', run: () => setEditing({ kind: 'season' }) });

  const page = path === '/lobby' ? 'lobby' : playbill ? 'playbill' : path === '/close' && season ? 'close' : 'stage';
  return (
    <div className="pl">
      <nav className="pl-tabs" aria-label="PROLOGUE">
        <a href={house.href('/')} aria-current={page === 'stage' || page === 'close' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); house.navigate(house.href('/')); }}>This season</a>
        <a href={house.href('/lobby')} aria-current={page === 'lobby' || page === 'playbill' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); house.navigate(house.href('/lobby')); }}>The lobby</a>
      </nav>
      {page === 'lobby' && <Lobby seasons={seasons} hopes={hopes} />}
      {page === 'playbill' && <PlaybillPage season={seasons.find((s) => s.id === playbill![1])} hopes={hopes} />}
      {page === 'close' && season && <EpilogueView season={season} hopes={hopesOf(hopes, season.id)} />}
      {page === 'stage' && (season ? <StageView season={season} hopes={hopesOf(hopes, season.id)} onHope={(h) => setEditing({ kind: 'hope', ...(h ? { existing: h } : {}) })} onSeason={() => setEditing({ kind: 'season', existing: season })} /> : <ClosedCurtain onBegin={() => setEditing({ kind: 'season' })} hasPast={seasons.length > 0} />)}
      {editing?.kind === 'hope' && season && <HopeEditor key={editing.existing?.id ?? 'new'} season={season} existing={editing.existing} onClose={() => setEditing(null)} />}
      {editing?.kind === 'season' && <SeasonEditor existing={editing.existing} others={sortSeasons(seasons).filter((s) => s.id !== editing.existing?.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ClosedCurtain({ onBegin, hasPast }: { onBegin(): void; hasPast: boolean }) {
  return (
    <div className="pl-frame pl-frame--closed">
      <div className="pl-proscenium">
        <div className="pl-curtain is-closed" aria-hidden="true">
          <span className="pl-curtain__half pl-curtain__half--l" />
          <span className="pl-curtain__half pl-curtain__half--r" />
        </div>
        <div className="pl-closed__copy">
          <p className="pl-eyebrow">PROLOGUE · Hopes for the season</p>
          <h1 className="pl-display">Every season opens with a prologue.</h1>
          <p className="pl-lede">What do you hope this one holds?</p>
          <Button variant="primary" onClick={onBegin}>
            Begin this season
          </Button>
          {hasPast && <p className="pl-small">Past seasons hang in the lobby.</p>}
        </div>
      </div>
    </div>
  );
}

/** Types the season's name in Special Elite, then resolves into the playbill face. */
function TypedTitle({ text, play }: { text: string; play: boolean }) {
  const [n, setN] = useState(play ? 0 : text.length);
  useEffect(() => {
    if (!play) return;
    const per = Math.min(40, 1000 / Math.max(1, text.length));
    const id = window.setInterval(() => setN((x) => (x >= text.length ? (window.clearInterval(id), x) : x + 1)), per);
    return () => window.clearInterval(id);
  }, [play, text]);
  const done = n >= text.length;
  return (
    <h1 className={`pl-season ${done ? 'is-set' : 'is-typing'}`} aria-label={text}>
      <span aria-hidden="true">{done ? text : text.slice(0, n)}</span>
    </h1>
  );
}

function StageView({ season, hopes, onHope, onSeason }: { season: Season; hopes: Hope[]; onHope(h?: Hope): void; onSeason(): void }) {
  const house = useHouse();
  const { today } = house;
  const curtainKey = `prologue.curtain.${season.id}`;
  // The curtain goes up once, on the season's first visit from its first day (not in rehearsal).
  const rehearsal = inRehearsal(season, today);
  const [opening] = useState(() => !rehearsal && !house.isDismissed(curtainKey) && !reduced());
  useEffect(() => {
    if (!rehearsal && !house.isDismissed(curtainKey)) house.dismiss(curtainKey);
  }, [curtainKey, house, rehearsal]);
  const [focus, setFocus] = useState(0);
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');
  const lit = house.immersive.allowed && dimension === '3d';
  const people = house.capability('people.mention');
  const rituals = house.capability('rituals.list');
  const ritualWeek = house.capability('rituals.week');
  const cast = useMemo(() => [...new Set(hopes.flatMap((h) => h.peopleRefs))].map((id) => ({ id, name: people?.nameOf(id) ?? null })).filter((c) => c.name), [hopes, people]);
  const overdue = isOverdue(season, today);
  const closable = canClose(season, today);
  const [word, ...rest] = season.name.split(' ');

  return (
    <div className={`pl-frame ${lit ? 'is-lit' : ''}`}>
      {lit && <LitStage spot={0.3 + (focus / Math.max(1, hopes.length)) * 0.5} onDowngrade={() => setDimension('2d')} />}
      <div className="pl-tools">
        <DimensionToggle value={lit ? '3d' : '2d'} onChange={setDimension} allowed={house.immersive.allowed} reason={house.immersive.reason} label3d="Stage lights" />
      </div>
      <aside className="pl-wing pl-wing--l" aria-label="Cast">
        <details open>
          <summary>Cast{cast.length ? ` · ${cast.length}` : ''}</summary>
          {cast.length ? (
            <ul>
              {cast.map((c) => (
                <li key={c.id}>
                  <a href={people!.href(c.id)} onClick={(e) => { e.preventDefault(); house.navigate(people!.href(c.id)); }}>{c.name}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-small">{people ? 'Add people to a hope and they appear here.' : 'With KINDRED, the people in your hopes appear here.'}</p>
          )}
        </details>
      </aside>
      <div className="pl-proscenium">
        {opening && (
          <div className="pl-curtain is-opening" aria-hidden="true">
            <span className="pl-curtain__half pl-curtain__half--l" />
            <span className="pl-curtain__half pl-curtain__half--r" />
          </div>
        )}
        <header className="pl-bill">
          <TypedTitle text={word!.toUpperCase().split('').join(' ')} play={opening} />
          {rest.length > 0 && <p className="pl-year">{rest.join(' ')}</p>}
          {rehearsal && <p className="pl-direction pl-rehearsal">(In rehearsal. The curtain rises on {formatLong(season.start)}.)</p>}
          {season.theme && (
            <>
              <p className="pl-of">— the season of —</p>
              <p className="pl-theme">{season.theme}</p>
            </>
          )}
        </header>
        {hopes.length === 0 ? (
          <div className="pl-noacts">
            <p className="pl-direction">(The stage is bare. A season holds a few acts: what do you hope for?)</p>
            <Button variant="primary" onClick={() => onHope()}>
              Add a hope
            </Button>
          </div>
        ) : (
          <ol className="pl-acts">
            {hopes.map((h, i) => {
              const linked = h.ritualRef ? rituals?.list().find((r) => r.id === h.ritualRef) : undefined;
              const lastWeek = h.ritualRef && ritualWeek ? ritualWeek.week(h.ritualRef, addDays(today, -6)) : null;
              return (
                <li key={h.id} className={`pl-act is-${h.state}`}>
                  <button type="button" className="pl-act__btn" onClick={() => onHope(h)} onFocus={() => setFocus(i)} onMouseEnter={() => setFocus(i)}>
                    <span className="pl-act__no">ACT {roman(h.act)}.</span>
                    <span className="pl-act__title">{h.title}</span>
                    <span className="pl-act__state" title={STATE_HINT[h.state]}>
                      ( {STATE_LABEL[h.state].toLowerCase()}
                      {linked ? ` · REFRAIN: ${linked.name}${lastWeek ? (lastWeek.kept ? ', kept this week' : `, ${plural(lastWeek.notes, 'note')} this week`) : ''}` : ''}
                      {h.peopleRefs.length && people ? ` · with ${h.peopleRefs.map((p) => people.nameOf(p)).filter(Boolean).join(', ')}` : ''} )
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {(closable || overdue) && (
          <div className="pl-closebar">
            <Button variant="ghost" onClick={() => house.navigate(house.href('/close'))}>
              Close the season
            </Button>
          </div>
        )}
      </div>
      <aside className="pl-wing pl-wing--r" aria-label="Notes">
        <details open>
          <summary>Notes</summary>
          <p className="pl-note">
            {formatMedium(season.start)} → {formatMedium(season.end)}
          </p>
          {overdue ? (
            <p className="pl-note">{season.name.replace(/\s+\d{4}$/u, '')} has ended. Close the season when you’re ready.</p>
          ) : (
            <p className="pl-note">{rehearsal ? `Opens in ${plural(diffDays(today, season.start), 'day')}` : `${plural(daysRemaining(season, today), 'day')} remain`}</p>
          )}
          <p className="pl-note">{plural(hopes.length, 'act')} of seven</p>
          <button type="button" className="pl-link" onClick={onSeason}>
            Edit the season
          </button>
        </details>
      </aside>
    </div>
  );
}

const loadCurtain = () => import('./curtainScene');

function LitStage({ spot, onDowngrade }: { spot: number; onDowngrade(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<{ crimson: string; gilt: string } | null>(null);
  useEffect(() => {
    if (ref.current) {
      const c = themeColors(ref.current, ['curtain', 'gilt-light']);
      setColors({ crimson: c.curtain, gilt: c['gilt-light'] });
    }
  }, []);
  const props = useMemo<CurtainProps | null>(() => (colors ? { ...colors, spot } : null), [colors, spot]);
  return (
    <div ref={ref} className="pl-lit" aria-hidden="true">
      {props && <Stage3D load={loadCurtain} props={props} label="A theatre stage with crimson curtains and a spotlight." onDowngrade={onDowngrade} className="pl-lit__stage" />}
    </div>
  );
}

function Lobby({ seasons, hopes }: { seasons: readonly Season[]; hopes: readonly Hope[] }) {
  const house = useHouse();
  const closed = sortSeasons(seasons).filter((s) => s.closedAt).reverse();
  return (
    <section className="pl-lobby" aria-labelledby="pl-lobby-title">
      <header className="pl-lobby__head">
        <p className="pl-eyebrow">PROLOGUE · The lobby</p>
        <h1 id="pl-lobby-title" className="pl-display">Seasons past</h1>
      </header>
      {closed.length === 0 ? (
        <p className="pl-lede pl-center">No playbills yet. When you close a season, its playbill hangs here.</p>
      ) : (
        <ul className="pl-bills">
          {closed.map((s) => (
            <li key={s.id}>
              <button type="button" className="pl-mini" onClick={() => house.navigate(house.href(`/playbill/${s.id}`))}>
                <Playbill season={s} hopes={hopesOf(hopes, s.id)} compact />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MARK: Record<Hope['state'], string> = { wings: '·', stage: '·', bow: '✦', rewritten: '↻', letGo: '○' };

function Playbill({ season, hopes, compact = false }: { season: Season; hopes: Hope[]; compact?: boolean }) {
  return (
    <article className={`pl-playbill ${compact ? 'is-compact' : ''}`}>
      <p className="pl-playbill__house">ETERNALL presents</p>
      <h2 className="pl-playbill__title">{season.name}</h2>
      {season.theme && <p className="pl-playbill__theme">the season of {season.theme}</p>}
      <span className="pl-playbill__rule" aria-hidden="true" />
      <ol className="pl-playbill__acts">
        {hopes.map((h) => (
          <li key={h.id}>
            <span className="pl-playbill__mark" aria-hidden="true">{MARK[h.state]}</span> {h.title}
            <span className="visually-hidden">: {STATE_LABEL[h.state]}</span>
            {!compact && h.reflection && <span className="pl-playbill__ref">{h.reflection}</span>}
          </li>
        ))}
      </ol>
      <p className="pl-playbill__dates">
        {formatMedium(season.start)} — {formatMedium(season.end)}
      </p>
      {!compact && season.epilogue && (
        <section className="pl-playbill__epilogue">
          <h3>Epilogue</h3>
          <p>{season.epilogue}</p>
        </section>
      )}
      {!compact && <p className="pl-playbill__legend">✦ took a bow · ↻ rewritten · ○ let go</p>}
    </article>
  );
}

function PlaybillPage({ season, hopes }: { season: Season | undefined; hopes: readonly Hope[] }) {
  const house = useHouse();
  if (!season) return <p className="pl-lede pl-center">That playbill isn’t in the lobby.</p>;
  return (
    <div className="pl-programme">
      <button type="button" className="pl-back" onClick={() => house.navigate(house.href('/lobby'))}>
        <Icon name="left" size={16} /> Back to the lobby
      </button>
      <Playbill season={season} hopes={hopesOf(hopes, season.id)} />
    </div>
  );
}
