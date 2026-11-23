import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-400-italic.css';
import '@fontsource/bodoni-moda/latin-600.css';
import '@fontsource/libre-franklin/latin-400.css';
import '@fontsource/libre-franklin/latin-600.css';
import '@fontsource/bravura/latin-400.css';
import '../theme/refrain.css';
import '../theme/refrain.kit.css';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addDays, formatMedium, formatMonthYear, type ISODate, type ImprintAppProps } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Dialog, Icon } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import {
  MARK_PATH,
  RITUAL_PATH,
  WEEKDAYS,
  barDays,
  barStart,
  barSummary,
  beatOf,
  cadenceLabel,
  dueToday,
  keySet,
  markId,
  scoreNotes,
  yearLine,
  type Beat,
  type Mark,
  type Ritual,
} from '../rituals';
import { audioAvailable, play } from './audio';
import { RitualEditor } from './RitualEditor';
import { Chrome } from './Chrome';

const G = { clef: '', note: '', rest: '', fermata: '' };
/** Staff step of each pentatonic pitch (0 = bottom line E4; each step is half a staff space). */
const STEP = [-2, -1, 0, 2, 3, 5, 6, 7, 9, 10];
const BEAT_W = 40;
/** Room for the clef before the first beat, so a Monday note never sits on it. */
const CLEF = 34;
const lead = (bars: number) => CLEF / (CLEF + bars * 7 * BEAT_W);
const TEMPO = 96;

type Playing = null | { kind: 'week' | 'year'; bar: number; beat: number; silent: boolean };

export default function RefrainApp({ path }: ImprintAppProps) {
  const { items: rituals } = useCollection<Ritual>(RITUAL_PATH);
  const [editing, setEditing] = useState<null | { existing?: Ritual }>(null);
  const [sheet, setSheet] = useState(false);
  const m = /^\/ritual\/([A-Za-z0-9_-]+)$/.exec(path);
  const open = m ? rituals.find((r) => r.id === m[1]) : undefined;
  usePrimaryAction(rituals.length ? { label: 'Mark today', run: () => setSheet(true) } : { label: 'New ritual', run: () => setEditing({}) });

  return (
    <Chrome movement={open ? { no: 'II.', name: `Programme notes · ${open.name}` } : null}>
      <div className="rf">
        {open ? <ProgrammeNotes ritual={open} onEdit={() => setEditing({ existing: open })} /> : <Score onNew={() => setEditing({})} />}
        {editing && <RitualEditor key={editing.existing?.id ?? 'new'} {...editing} onClose={() => setEditing(null)} />}
        {sheet && <TodaySheet onClose={() => setSheet(false)} onNew={() => { setSheet(false); setEditing({}); }} />}
      </div>
    </Chrome>
  );
}

function useMarks() {
  const house = useHouse();
  const { items, col } = useCollection<Mark>(MARK_PATH);
  const kept = useMemo(() => keySet(items), [items]);
  const toggle = (r: Ritual, date: ISODate) => {
    const id = markId(r.id, date);
    const day = WEEKDAYS[(barDays(barStart(date)).indexOf(date) + 7) % 7];
    if (kept.has(id)) {
      const prev = col.remove(id);
      house.toast({ message: `${r.name} · ${day} back to a rest.`, ...(prev ? { action: { label: 'Undo', run: () => col.put(prev) } } : {}) });
    } else {
      col.put({ id, ritualId: r.id, date });
      house.toast({ message: `${r.name} · ${day} kept.`, tone: 'accent', action: { label: 'Undo', run: () => col.remove(id) } });
    }
  };
  return { marks: items, kept, toggle };
}

function Score({ onNew }: { onNew(): void }) {
  const house = useHouse();
  const { today } = house;
  const { items: all } = useCollection<Ritual>(RITUAL_PATH);
  const rituals = useMemo(() => [...all].sort((a, b) => a.startedOn.localeCompare(b.startedOn) || a.name.localeCompare(b.name)), [all]);
  const { marks, kept, toggle } = useMarks();
  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState<Playing>(null);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);
  const last = addDays(barStart(today), offset * 7);
  const bars = [-3, -2, -1, 0].map((i) => addDays(last, i * 7));
  const thisBar = barSummary(rituals, marks, barStart(today), today);
  const yearAllowed = house.immersive.reason !== 'patron';

  const start = (kind: 'week' | 'year') => {
    stopRef.current?.();
    const from = kind === 'week' ? last : addDays(barStart(today), -51 * 7);
    const count = kind === 'week' ? 1 : 52;
    const notes = scoreNotes(rituals, marks, from, count);
    const handle = play(notes, {
      bars: count,
      tempo: kind === 'week' ? TEMPO : 240,
      rich: kind === 'year' && yearAllowed,
      volume: 0.7,
      onBeat: (bar, beat) => setPlaying((p) => (p ? { ...p, bar, beat } : p)),
      onEnd: () => {
        setPlaying(null);
        stopRef.current = null;
      },
    });
    stopRef.current = handle.stop;
    setPlaying({ kind, bar: 0, beat: -1, silent: handle.silent });
  };

  if (!rituals.length) {
    return (
      <>
        <Head />
        <div className="rf-empty">
          <svg className="rf-empty__staff" viewBox="0 0 560 100" aria-hidden="true">
            <StaffLines width={560} />
            <text x="270" y="22" className="rf-glyph rf-glyph--soft">{G.fermata}</text>
            <line x1="558" y1="30" x2="558" y2="70" className="rf-bar rf-bar--heavy" />
          </svg>
          <p className="rf-empty__text">What do you want to return to? A refrain is anything you come back to: a run, a call, a page a day.</p>
          <Button variant="primary" icon="plus" onClick={onNew}>
            New ritual
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head
        aside={
          <>
            <p className="rf-week">
              {formatMonthYear(today)} · this week {thisBar.kept} of {thisBar.active} kept
            </p>
            <div className="rf-transport">
              {playing ? (
                <Button variant="ghost" icon="close" onClick={() => stopRef.current?.()}>
                  Stop
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => start('week')}>
                    ▶ Play {offset === 0 ? 'this week' : 'that week'}
                  </Button>
                  <Button variant="quiet" onClick={() => start('year')} title={yearAllowed ? '52 weeks in about 90 seconds' : 'Part of Patron — plays with simple sounds here'}>
                    Play the year{yearAllowed ? '' : ' (simple)'}
                  </Button>
                </>
              )}
            </div>
          </>
        }
      />
      {playing?.silent && (
        <p className="rf-note" role="status">
          {audioAvailable() ? 'Sound is off here; follow the playhead instead.' : 'Sound isn’t available in this browser; follow the playhead instead.'}
        </p>
      )}
      <p className="rf-legend" aria-hidden="true">
        <span className="rf-glyph-inline">{G.note}</span> kept <span className="rf-glyph-inline">{G.rest}</span> rest <span className="rf-glyph-inline rf-soft">{G.rest}</span> free day
      </p>

      {playing?.kind === 'year' ? (
        <YearPiece rituals={rituals} marks={marks} bar={playing.bar} beat={playing.beat} />
      ) : (
        <section className="rf-score" aria-label="Your rituals, four weeks of the score">
          <div className="rf-nav">
            <button type="button" className="rf-nav__btn" onClick={() => setOffset((o) => o - 1)}>
              <Icon name="left" size={14} /> Earlier
            </button>
            {offset !== 0 && (
              <button type="button" className="rf-nav__btn" onClick={() => setOffset(0)}>
                Back to this week
              </button>
            )}
            <button type="button" className="rf-nav__btn" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset === 0}>
              Later <Icon name="right" size={14} />
            </button>
          </div>
          <div className="rf-system rf-system--head" aria-hidden="true">
            <span />
            <div className="rf-bars rf-bars--head" style={{ ['--lead' as string]: lead(bars.length) }}>
              {bars.map((b) => (
                <div key={b} className="rf-barhead">
                  <span className="rf-barhead__date">{formatMedium(b)}</span>
                  <span className="rf-barhead__days">
                    {'MTWTFSS'.split('').map((d, i) => (
                      <span key={i} className={addDays(b, i) === today ? 'is-today' : ''}>
                        {d}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {rituals.map((r) => (
            <System key={r.id} ritual={r} bars={bars} kept={kept} today={today} onToggle={(d) => toggle(r, d)} playhead={playing?.kind === 'week' ? playing.beat + 21 : null} />
          ))}
          <button type="button" className="rf-add" onClick={onNew}>
            <Icon name="plus" size={14} /> New ritual
          </button>
        </section>
      )}
    </>
  );
}

function Head({ aside }: { aside?: ReactNode }) {
  return (
    <header className="rf-head">
      <div>
        <h1 className="rf-title">
          The lines you <em>come back to.</em>
        </h1>
      </div>
      {aside && <div className="rf-head__aside">{aside}</div>}
    </header>
  );
}

function StaffLines({ width }: { width: number }) {
  return (
    <g className="rf-lines">
      {[30, 40, 50, 60, 70].map((y) => (
        <line key={y} x1="0" x2={width} y1={y} y2={y} />
      ))}
    </g>
  );
}

const LABEL: Record<Beat, string> = { kept: 'kept', rest: 'a rest', open: 'not marked yet', free: 'a free day', future: 'still ahead', off: 'not part of this ritual yet' };

/** One ritual as a line of the score: four bars of seven beats, one SVG, a grid of switches on top. */
function System({ ritual, bars, kept, today, onToggle, playhead }: { ritual: Ritual; bars: ISODate[]; kept: ReadonlySet<string>; today: ISODate; onToggle(d: ISODate): void; playhead: number | null }) {
  const house = useHouse();
  const days = bars.flatMap((b) => barDays(b));
  const width = CLEF + days.length * BEAT_W;
  const step = STEP[ritual.pitch % STEP.length]!;
  const noteY = 70 - step * 5;
  return (
    <div className={`rf-system ${ritual.pausedOn ? 'is-paused' : ''}`}>
      <button type="button" className="rf-instrument" onClick={() => house.navigate(house.href(`/ritual/${ritual.id}`))}>
        <span className="rf-instrument__name">{ritual.name}</span>
        <span className="rf-instrument__cadence">{ritual.pausedOn ? 'Paused' : cadenceLabel(ritual.cadence)}</span>
      </button>
      <div className="rf-bars rf-bars--staff" style={{ ['--lead' as string]: lead(bars.length) }}>
        <svg viewBox={`0 0 ${width} 100`} className="rf-staff" aria-hidden="true">
          {days.map((d, i) => d === today && <rect key="today" x={CLEF + i * BEAT_W} y="12" width={BEAT_W} height="76" className="rf-today" />)}
          {playhead !== null && playhead >= 0 && <rect x={CLEF + playhead * BEAT_W} y="8" width={BEAT_W} height="84" className="rf-playhead" />}
          <StaffLines width={width} />
          <text x="2" y="60" className="rf-glyph rf-clef">{G.clef}</text>
          {bars.map((b, i) => {
            const monthTurn = barDays(b).some((d) => d.endsWith('-01'));
            return i > 0 && <line key={b} x1={CLEF + i * 7 * BEAT_W} x2={CLEF + i * 7 * BEAT_W} y1="30" y2="70" className={`rf-bar ${monthTurn ? 'rf-bar--double' : ''}`} />;
          })}
          <line x1={width - 1} x2={width - 1} y1="30" y2="70" className="rf-bar" />
          {days.map((d, i) => {
            const beat = beatOf(ritual, d, kept, today);
            const cx = CLEF + i * BEAT_W + BEAT_W / 2;
            const sounding = playhead === i;
            if (beat === 'kept') {
              return (
                <g key={d} className={`rf-noteg ${sounding ? 'is-sounding' : ''}`}>
                  {step <= -2 && <line x1={cx - 9} x2={cx + 9} y1="80" y2="80" className="rf-ledger" />}
                  {step >= 10 && <line x1={cx - 9} x2={cx + 9} y1="20" y2="20" className="rf-ledger" />}
                  <text x={cx - 6} y={noteY} className="rf-glyph rf-note" style={{ animationDelay: `${(i % 7) * 18}ms` }}>
                    {G.note}
                  </text>
                </g>
              );
            }
            if (beat === 'rest' || beat === 'free' || beat === 'open') {
              return (
                <text key={d} x={cx - 5} y="50" className={`rf-glyph rf-rest ${beat === 'rest' ? '' : 'rf-rest--soft'}`}>
                  {G.rest}
                </text>
              );
            }
            if (beat === 'future') return <circle key={d} cx={cx} cy="50" r="1.4" className="rf-dot" />;
            return null;
          })}
        </svg>
        <div className="rf-beats" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((d) => {
            const beat = beatOf(ritual, d, kept, today);
            const disabled = beat === 'future' || beat === 'off';
            return (
              <button
                key={d}
                type="button"
                role="switch"
                aria-checked={beat === 'kept'}
                disabled={disabled}
                className="rf-beat"
                aria-label={`${ritual.name}, ${WEEKDAYS[barDays(barStart(d)).indexOf(d)]} ${formatMedium(d)}: ${LABEL[beat]}`}
                onClick={() => onToggle(d)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "The year as a piece": every ritual's 52 bars as one dense line, the playhead crossing them. */
function YearPiece({ rituals, marks, bar, beat }: { rituals: readonly Ritual[]; marks: readonly Mark[]; bar: number; beat: number }) {
  const { today } = useHouse();
  return (
    <section className="rf-year" aria-label={`Playing the year, week ${bar + 1} of 52`}>
      <p className="rf-year__count" aria-live="off">
        Week {bar + 1} of 52
      </p>
      {rituals.map((r) => (
        <div key={r.id} className="rf-year__row">
          <span className="rf-instrument__name">{r.name}</span>
          <YearLine ritual={r} marks={marks} today={today} at={bar + Math.max(0, beat) / 7} />
        </div>
      ))}
    </section>
  );
}

function YearLine({ ritual, marks, today, at }: { ritual: Ritual; marks: readonly Mark[]; today: ISODate; at?: number }) {
  const line = yearLine(ritual, marks, today);
  return (
    <svg viewBox="0 0 520 28" className="rf-yearline" role="img" aria-label={`${ritual.name}: ${line.reduce((a, b) => a + b, 0)} notes in the last 52 weeks`}>
      <line x1="0" x2="520" y1="27" y2="27" className="rf-lines" />
      {line.map((n, i) => (
        <rect key={i} x={i * 10 + 2} y={27 - n * 3.6} width="6" height={n * 3.6} className={at !== undefined && i <= at ? 'rf-yearline__on' : 'rf-yearline__bar'} />
      ))}
      {at !== undefined && <line x1={at * 10} x2={at * 10} y1="0" y2="28" className="rf-yearline__head" />}
    </svg>
  );
}

function ProgrammeNotes({ ritual, onEdit }: { ritual: Ritual; onEdit(): void }) {
  const house = useHouse();
  const { col } = useCollection<Ritual>(RITUAL_PATH);
  const { marks } = useMarks();
  const mine = marks.filter((m) => m.ritualId === ritual.id);
  const [confirm, setConfirm] = useState(false);
  const pause = () => {
    col.put({ ...ritual, pausedOn: ritual.pausedOn ? null : house.today });
    house.toast({ message: ritual.pausedOn ? `${ritual.name} picks up again.` : `${ritual.name} is paused. Its notes stay in the score.` });
  };
  return (
    <article className="rf-programme">
      <button type="button" className="rf-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the score
      </button>
      <p className="rf-eyebrow">Programme notes</p>
      <h1 className="rf-programme__title">{ritual.name}</h1>
      {ritual.why && <p className="rf-programme__why">“{ritual.why}”</p>}
      <dl className="rf-programme__facts">
        <div>
          <dt>How often</dt>
          <dd>{cadenceLabel(ritual.cadence)}</dd>
        </div>
        <div>
          <dt>Its sound</dt>
          <dd className="rf-cap">{ritual.instrument}</dd>
        </div>
        <div>
          <dt>Since</dt>
          <dd>{formatMedium(ritual.startedOn)}</dd>
        </div>
        <div>
          <dt>Notes kept</dt>
          <dd>{mine.length}</dd>
        </div>
      </dl>
      <h2 className="rf-h2">The year in one line</h2>
      <YearLine ritual={ritual} marks={marks} today={house.today} />
      <div className="rf-programme__actions">
        <Button variant="ghost" icon="pen" onClick={onEdit}>
          Edit ritual
        </Button>
        <Button variant="quiet" onClick={pause}>
          {ritual.pausedOn ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="quiet" icon="trash" onClick={() => setConfirm(true)}>
          Remove…
        </Button>
      </div>
      {confirm && (
        <Dialog
          open
          title={`Remove ${ritual.name}?`}
          eyebrow="REFRAIN"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  col.remove(ritual.id);
                  house.navigate(house.href('/'));
                  house.toast({ message: `${ritual.name} removed.`, action: { label: 'Undo', run: () => col.put(ritual) } });
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          <p className="muted">Its line leaves the score. Pausing keeps it instead, if you might come back to it.</p>
        </Dialog>
      )}
    </article>
  );
}

/** The spine's "Mark today": today's rituals as large switches. */
function TodaySheet({ onClose, onNew }: { onClose(): void; onNew(): void }) {
  const { today } = useHouse();
  const { items } = useCollection<Ritual>(RITUAL_PATH);
  const { kept, toggle } = useMarks();
  const due = dueToday(items, today);
  return (
    <Dialog open title="Today" eyebrow={`REFRAIN · ${formatMedium(today)}`} onClose={onClose} footer={<><Button variant="quiet" icon="plus" onClick={onNew}>New ritual</Button><span className="spacer" /><Button variant="primary" onClick={onClose}>Done</Button></>}>
      {due.length === 0 ? (
        <p className="muted">Nothing is due today. A rest is part of the music.</p>
      ) : (
        <ul className="rf-today-list">
          {due.map((r) => {
            const on = kept.has(markId(r.id, today));
            return (
              <li key={r.id}>
                <button type="button" role="switch" aria-checked={on} className={`rf-today-item ${on ? 'is-on' : ''}`} onClick={() => toggle(r, today)}>
                  <span className="rf-glyph-inline" aria-hidden="true">{on ? G.note : G.rest}</span>
                  <span className="rf-today-item__name">{r.name}</span>
                  <span className="rf-today-item__state">{on ? 'Kept' : 'Mark'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
