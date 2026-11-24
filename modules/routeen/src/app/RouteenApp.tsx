import '@fontsource/young-serif/latin-400.css';
import '@fontsource/work-sans/latin-400.css';
import '@fontsource/work-sans/latin-400-italic.css';
import '@fontsource/work-sans/latin-600.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-600.css';
import '../theme/routeen.css';
import '../theme/routeen.kit.css';
import { useMemo, useState } from 'react';
import { addDays, formatMedium, plural, type ISODate, type ImprintAppProps } from '@eternall/core';
import { LookPicker, useAppLook, useHouse, usePrimaryAction } from '@eternall/kit';
import { LOOK_PATH, ROUTEEN_LOOKS } from '../look';
import { Button, Dialog, Icon } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import {
  MARK_PATH,
  PRACTICE_PATH,
  WEEKDAYS,
  barStart,
  barSummary,
  cadenceLabel,
  clothLine,
  dueToday,
  dyeOf,
  keySet,
  markId,
  patternOf,
  weave,
  type Mark,
  type Practice,
  type Stitch,
} from '../practices';
import { PracticeEditor } from './PracticeEditor';
import { Chrome, type RouteenPlace } from './Chrome';
import { Woven } from './Ceremony';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STITCH_LABEL: Record<Stitch, string> = { woven: 'woven', warp: 'bare warp, not kept', open: 'not woven yet', plain: 'a day off', future: 'still ahead', off: 'not on the loom then' };

const byLoomOrder = (a: Practice, b: Practice) => a.startedOn.localeCompare(b.startedOn) || a.name.localeCompare(b.name);
const threadClass = (p: Practice) => `rt-dye--${dyeOf(p)} rt-pattern--${patternOf(p)}`;

export default function RouteenApp({ path, search }: ImprintAppProps) {
  const { items } = useCollection<Practice>(PRACTICE_PATH);
  const practices = useMemo(() => [...items].sort(byLoomOrder), [items]);
  // Home's "Mark today" and "Add a practice" arrive as ?mark=1 and ?new=1.
  const [editing, setEditing] = useState<null | { existing?: Practice }>(search.get('new') ? {} : null);
  const [sheet, setSheet] = useState(!!search.get('mark') && items.length > 0);
  const m = /^\/practice\/([A-Za-z0-9_-]+)$/.exec(path);
  const open = m ? practices.find((p) => p.id === m[1]) : undefined;
  const here: RouteenPlace = path === '/cloth' ? 'cloth' : m ? 'practice' : 'loom';
  // The person's look for their cloth (docs/adr/0014), worn while ROUTEEN is open.
  const look = useAppLook(ROUTEEN_LOOKS, LOOK_PATH);
  usePrimaryAction(practices.length ? { label: 'Mark today', run: () => setSheet(true) } : { label: 'New practice', run: () => setEditing({}) });

  return (
    <Chrome here={here}>
      <div className="rt">
        {open ? <PracticePage practice={open} onEdit={() => setEditing({ existing: open })} /> : here === 'cloth' ? <Cloth practices={practices} look={look} /> : <Loom practices={practices} onNew={() => setEditing({})} />}
        {editing && <PracticeEditor key={editing.existing?.id ?? 'new'} {...editing} onClose={() => setEditing(null)} />}
        {sheet && (
          <TodaySheet
            practices={practices}
            onClose={() => setSheet(false)}
            onNew={() => {
              setSheet(false);
              setEditing({});
            }}
          />
        )}
      </div>
    </Chrome>
  );
}

function useMarks(practices: readonly Practice[]) {
  const house = useHouse();
  const { items, col } = useCollection<Mark>(MARK_PATH);
  const kept = useMemo(() => keySet(items), [items]);
  const weaveDay = (p: Practice, date: ISODate, on: boolean, quiet = false) => {
    const id = markId(p.id, date);
    if (!on) {
      const prev = col.remove(id);
      if (!quiet) house.toast({ message: `${p.name} · ${formatMedium(date)} unwoven.`, ...(prev ? { action: { label: 'Undo', run: () => col.put(prev) } } : {}) });
      return;
    }
    col.put({ id, ritualId: p.id, date });
    if (quiet) return;
    house.toast({ message: `${p.name} · ${formatMedium(date)} woven.`, tone: 'accent', action: { label: 'Undo', run: () => col.remove(id) } });
    const due = date === house.today ? dueToday(practices, date) : [];
    const all = due.length > 1 && due.every((d) => d.id === p.id || kept.has(markId(d.id, date)));
    house.ceremony(<Woven name={p.name} dye={dyeOf(p)} pattern={patternOf(p)} all={all} />, 700);
  };
  return { marks: items, kept, weaveDay };
}

function Loom({ practices, onNew }: { practices: readonly Practice[]; onNew(): void }) {
  const house = useHouse();
  const { today } = house;
  const { marks, weaveDay } = useMarks(practices);
  const [offset, setOffset] = useState(0);
  const start = addDays(barStart(today), offset * 7);
  const strip = weave(practices, marks, start, today);
  const thisWeek = barSummary(practices, marks, barStart(today), today);

  if (!practices.length) {
    return (
      <div className="rt-empty">
        <div className="rt-empty__loom" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="rt-stitch rt-stitch--warp" />
          ))}
        </div>
        <h1 className="rt-title">An empty loom.</h1>
        <p className="rt-lede">Add your first practice — something you want to return to: a run, a call, a page a day. Each one becomes a thread, and every day weaves a row.</p>
        <Button variant="primary" icon="plus" onClick={onNew}>
          New practice
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="rt-head">
        <h1 className="rt-title">
          The <em>loom</em>
        </h1>
        <p className="rt-lede">
          This week · {thisWeek.kept} of {plural(thisWeek.active, 'practice')} woven
        </p>
      </header>

      <section className="rt-loom" aria-label={`The week of ${formatMedium(start)}`}>
        <div className="rt-nav">
          <button type="button" className="rt-nav__btn" onClick={() => setOffset((o) => o - 1)}>
            <Icon name="left" size={14} /> Earlier
          </button>
          <span className="rt-nav__week">{offset === 0 ? 'This week' : `Week of ${formatMedium(start)}`}</span>
          {offset !== 0 && (
            <button type="button" className="rt-nav__btn" onClick={() => setOffset(0)}>
              Back to this week
            </button>
          )}
          <button type="button" className="rt-nav__btn" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset === 0}>
            Later <Icon name="right" size={14} />
          </button>
        </div>

        <div className="rt-grid" role="table" aria-label="Practices by day">
          <div className="rt-row rt-row--head" role="row">
            <span role="columnheader" className="rt-name">
              <span className="visually-hidden">Practice</span>
            </span>
            {DAY_LETTERS.map((d, i) => {
              const date = addDays(start, i);
              return (
                <span key={date} role="columnheader" className={`rt-day ${date === today ? 'is-today' : ''}`} aria-label={`${WEEKDAYS[i]} ${formatMedium(date)}`}>
                  <span aria-hidden="true">{d}</span>
                  <span className="rt-day__date" aria-hidden="true">
                    {date.slice(8)}
                  </span>
                </span>
              );
            })}
          </div>
          {strip.map(({ practice: p, stitches }) => (
            <div key={p.id} role="row" className={`rt-row ${p.pausedOn ? 'is-paused' : ''}`}>
              <span role="rowheader" className="rt-name">
                <button type="button" className="rt-name__btn" onClick={() => house.navigate(house.href(`/practice/${p.id}`))}>
                  <span className={`rt-swatch ${threadClass(p)}`} aria-hidden="true" />
                  <span className="rt-name__text">{p.name}</span>
                  <span className="rt-name__cadence">{p.pausedOn ? 'Paused' : cadenceLabel(p.cadence)}</span>
                </button>
              </span>
              {stitches.map((st, i) => {
                const date = addDays(start, i);
                const disabled = st === 'future' || st === 'off';
                return (
                  <span key={date} role="cell" className={`rt-cell ${date === today ? 'is-today' : ''}`}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={st === 'woven'}
                      disabled={disabled}
                      className={`rt-stitch rt-stitch--${st} ${threadClass(p)}`}
                      aria-label={`${p.name}, ${WEEKDAYS[i]} ${formatMedium(date)}: ${STITCH_LABEL[st]}`}
                      onClick={() => weaveDay(p, date, st !== 'woven')}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <p className="rt-legend" aria-hidden="true">
          <span className="rt-stitch rt-stitch--woven rt-dye--indigo rt-pattern--plain" /> woven <span className="rt-stitch rt-stitch--warp" /> bare warp <span className="rt-stitch rt-stitch--plain" /> day off{' '}
          <span className="rt-stitch rt-stitch--open rt-dye--indigo" /> still to weave
        </p>
        <button type="button" className="rt-add" onClick={onNew}>
          <Icon name="plus" size={14} /> New practice
        </button>
      </section>
    </>
  );
}

/** A year of one thread: 52 weeks, each as dense as the stitches woven in it. */
function ClothLine({ practice, marks, today }: { practice: Practice; marks: readonly Mark[]; today: ISODate }) {
  const line = clothLine(practice, marks, today);
  const total = line.reduce((a, b) => a + b, 0);
  return (
    <div className="rt-clothline" role="img" aria-label={`${practice.name}: woven ${plural(total, 'time')} in the last 52 weeks`}>
      {line.map((n, i) => (
        <span key={i} className={`rt-weekcell ${n ? `rt-stitch--woven ${threadClass(practice)}` : 'rt-stitch--warp'}`} style={{ ['--fill' as string]: Math.min(1, n / 7) }} />
      ))}
    </div>
  );
}

function Cloth({ practices, look }: { practices: readonly Practice[]; look: ReturnType<typeof useAppLook> }) {
  const house = useHouse();
  const { marks } = useMarks(practices);
  const year = house.today.slice(0, 4);
  const thisYear = marks.filter((m) => m.date.startsWith(year)).length;
  return (
    <>
      <header className="rt-head">
        <h1 className="rt-title">
          The <em>cloth</em>
        </h1>
        <p className="rt-lede">The last 52 weeks, one band per thread · woven {plural(thisYear, 'time')} this year</p>
      </header>
      {practices.length === 0 ? (
        <p className="rt-lede">The cloth starts with your first practice.</p>
      ) : (
        <section className="rt-cloth" aria-label="The year's cloth">
          {practices.map((p) => (
            <div key={p.id} className="rt-band">
              <button type="button" className="rt-name__btn" onClick={() => house.navigate(house.href(`/practice/${p.id}`))}>
                <span className={`rt-swatch ${threadClass(p)}`} aria-hidden="true" />
                <span className="rt-name__text">{p.name}</span>
              </button>
              <ClothLine practice={p} marks={marks} today={house.today} />
            </div>
          ))}
        </section>
      )}
      <section className="rt-look" aria-labelledby="rt-look-title">
        <h2 id="rt-look-title" className="rt-h2">
          Your cloth’s look
        </h2>
        <p className="rt-lede">Choose the cloth on your loom. Every choice applies at once and stays readable; each thread keeps its own dye and weave. Day or night follows ETERNALL.</p>
        <LookPicker
          spec={ROUTEEN_LOOKS}
          look={look.look}
          onChange={look.setLook}
          accentLegend="Accent thread"
          sample={() => (
            <span className="rt-sample">
              {(['indigo', 'madder', 'weld', 'walnut', 'lichen', 'iron'] as const).map((d, i) => (
                <span key={d} className={`rt-stitch rt-stitch--${i === 2 ? 'warp' : 'woven'} rt-dye--${d} rt-pattern--${(['plain', 'twill', 'dotted', 'rib', 'herringbone', 'basket'] as const)[i]}`} />
              ))}
            </span>
          )}
        />
      </section>
    </>
  );
}

function PracticePage({ practice, onEdit }: { practice: Practice; onEdit(): void }) {
  const house = useHouse();
  const { col } = useCollection<Practice>(PRACTICE_PATH);
  const { marks } = useMarks([practice]);
  const mine = marks.filter((m) => m.ritualId === practice.id);
  const [confirm, setConfirm] = useState(false);
  const pause = () => {
    col.put({ ...practice, pausedOn: practice.pausedOn ? null : house.today });
    house.toast({ message: practice.pausedOn ? `${practice.name} is back on the loom.` : `${practice.name} is paused. Its rows stay in the cloth.` });
  };
  return (
    <article className="rt-practice">
      <button type="button" className="rt-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the loom
      </button>
      <p className="rt-eyebrow">
        <span className={`rt-swatch ${threadClass(practice)}`} aria-hidden="true" /> {dyeOf(practice)} thread · {patternOf(practice)} weave
      </p>
      <h1 className="rt-title">{practice.name}</h1>
      {practice.why && <p className="rt-why">“{practice.why}”</p>}
      <dl className="rt-facts">
        <div>
          <dt>How often</dt>
          <dd>{cadenceLabel(practice.cadence)}</dd>
        </div>
        <div>
          <dt>Since</dt>
          <dd>{formatMedium(practice.startedOn)}</dd>
        </div>
        <div>
          <dt>Woven</dt>
          <dd>{plural(mine.length, 'time')}</dd>
        </div>
        {practice.pausedOn && (
          <div>
            <dt>Paused</dt>
            <dd>{formatMedium(practice.pausedOn)}</dd>
          </div>
        )}
      </dl>
      <h2 className="rt-h2">Its year in the cloth</h2>
      <ClothLine practice={practice} marks={marks} today={house.today} />
      <div className="rt-actions">
        <Button variant="ghost" icon="pen" onClick={onEdit}>
          Edit practice
        </Button>
        <Button variant="quiet" onClick={pause}>
          {practice.pausedOn ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="quiet" icon="trash" onClick={() => setConfirm(true)}>
          Remove…
        </Button>
      </div>
      {confirm && (
        <Dialog
          open
          title={`Remove ${practice.name}?`}
          eyebrow="ROUTEEN"
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
                  col.remove(practice.id);
                  house.navigate(house.href('/'));
                  house.toast({ message: `${practice.name} is off the loom.`, action: { label: 'Undo', run: () => col.put(practice) } });
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          <p className="muted">Its thread leaves the loom. Pausing keeps it instead, if you might come back to it.</p>
        </Dialog>
      )}
    </article>
  );
}

/** "Mark today": today's practices as checkboxes, then the others; Weave writes what changed. */
function TodaySheet({ practices, onClose, onNew }: { practices: readonly Practice[]; onClose(): void; onNew(): void }) {
  const house = useHouse();
  const { today } = house;
  const { kept, weaveDay } = useMarks(practices);
  const active = practices.filter((p) => !p.pausedOn || p.pausedOn > today);
  const due = dueToday(active, today);
  const others = active.filter((p) => !due.includes(p));
  const [checked, setChecked] = useState<Set<string>>(() => new Set(active.filter((p) => kept.has(markId(p.id, today))).map((p) => p.id)));
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const commit = () => {
    const changed = active.filter((p) => checked.has(p.id) !== kept.has(markId(p.id, today)));
    const added = changed.filter((p) => checked.has(p.id));
    for (const p of changed) weaveDay(p, today, checked.has(p.id), true);
    if (added.length) {
      const all = due.length > 0 && due.every((p) => checked.has(p.id));
      house.ceremony(<Woven name={added.length === 1 ? added[0]!.name : `${added.length} practices`} dye={dyeOf(added[0]!)} pattern={patternOf(added[0]!)} all={all} />, 700);
      house.toast({ message: `${plural(added.length, 'row')} woven today.`, tone: 'accent' });
    }
    onClose();
  };
  const item = (p: Practice) => (
    <li key={p.id}>
      <label className="rt-check">
        <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} />
        <span className={`rt-swatch ${threadClass(p)}`} aria-hidden="true" />
        <span>{p.name}</span>
      </label>
    </li>
  );
  return (
    <Dialog
      open
      title="Mark today"
      eyebrow={`ROUTEEN · ${formatMedium(today)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" icon="plus" onClick={onNew}>
            New practice
          </Button>
          <span className="spacer" />
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={commit}>
            Weave
          </Button>
        </>
      }
    >
      {due.length > 0 ? <ul className="rt-checks">{due.map(item)}</ul> : <p className="muted">Nothing is due today. A day off is plain weave.</p>}
      {others.length > 0 && (
        <>
          <p className="rt-checks__head">Also today</p>
          <ul className="rt-checks">{others.map(item)}</ul>
        </>
      )}
    </Dialog>
  );
}
