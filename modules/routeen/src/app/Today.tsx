import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createId, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Segmented, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { allAsPlanned, frontPage, groupByTime, tapTier, type Group } from '../front';
import { offerBackToNormal, type Mode } from '../modes';
import { LIMITS, PRACTICE_PATH, markId, tierOf, validatePractice, weekdayOf, type Practice, type Tier } from '../practices';
import { sunPosition } from '../sky';
import { Lit } from './Ceremony';
import { MODE_GLYPH } from './glyphs';
import { Go } from './Go';
import { PracticeRow } from './PracticeRow';
import { SkyBand } from './SkyBand';
import type { Routine } from './useRoutine';

const MODES: readonly Mode[] = ['normal', 'low', 'off'];
const LIT_MS = 700;

/**
 * The front page (ADR 0015, ADR 0016): the day's sky across the page, with every practice in it at its
 * own place, then the practices as rows grouped by time of day in a fixed order. One tap lights a row;
 * its body lights in the sky, in place. Nothing on the page moves when something is lit. In the evening
 * the page offers All as planned; on a Day off nothing is asked, and anything can still be lit.
 */
export function Today({ routine: r, onNew }: { routine: Routine; onNew(): void }) {
  const house = useHouse();
  const { now } = r;
  const page = frontPage({ practices: r.practices, marks: r.marks, modes: r.modes, dayModes: r.dayModes, now, dayEndsAt: r.settings.dayEndsAt });
  const { today, mode } = page;
  const offer = offerBackToNormal(today, r.modes, r.settings.backToNormalDismissedOn);
  const bulk = allAsPlanned(page, r.marks);
  const nothingListed = page.groups.length + page.alsoToday.length === 0;
  const [justLit, setJustLit] = useState<string | null>(null);
  const band = useRef<HTMLElement>(null);
  const bandInView = useRef(true);
  const litTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Lit plays in the sky when the sky can be seen; otherwise (a long list on a phone) as the house's moment.
  useEffect(() => {
    const el = band.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      bandInView.current = !!e?.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(litTimer.current), []);

  const tierNow = (p: Practice): Tier | null => {
    const m = r.idx.get(markId(p.id, today));
    return m ? tierOf(m) : null;
  };
  const light = (p: Practice, tier: Tier | null) => {
    const was = tierNow(p);
    r.setTier(p, today, tier);
    if (!tier || was) return;
    setJustLit(p.id);
    clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setJustLit(null), LIT_MS);
    if (!bandInView.current) house.ceremony(<Lit name={p.name} tier={tier} />, LIT_MS);
  };

  const row = (p: Practice) => (
    <li key={p.id}>
      <PracticeRow practice={p} date={today} routine={r} onTap={() => light(p, tierNow(p) ? null : tapTier(mode))} onTier={(t) => light(p, tierNow(p) === t ? null : t)} />
    </li>
  );
  const group = (g: Group) => (
    <section key={g.time} className="rs-section rs-group" aria-labelledby={`rs-group-${g.time}`}>
      <h2 id={`rs-group-${g.time}`} className="rs-h2">
        {copy.times[g.time]}
        {mode !== 'off' && g.time === page.part && <span className="rs-now"> {copy.now}</span>}
      </h2>
      <ul className="rs-rows">{g.practices.map(row)}</ul>
    </section>
  );
  const onSky = groupByTime([...page.groups.flatMap((g) => g.practices), ...page.alsoToday]);
  const kindOf = (id: string) => {
    const m = r.idx.get(markId(id, today));
    return m ? tierOf(m) : 'unlit';
  };
  const names = new Map(r.practices.map((p) => [p.id, p.name]));

  return (
    <div className="rs-page rs-today" data-mode={mode}>
      <SkyBand
        ref={band}
        size="full"
        mode={mode}
        glow={page.glow}
        groups={onSky}
        kindOf={kindOf}
        nameOf={(id) => names.get(id) ?? ''}
        sun={sunPosition(now, r.settings.dayEndsAt)}
        label={copy.sky.band(page.markedDueCount, page.dueCount)}
        justLit={justLit}
      >
        <h1 className="rs-title">{copy.headline(copy.weekdays[weekdayOf(today)]!, copy.parts[page.part])}</h1>
        <ModeControl mode={mode} onChoose={r.setMode} />
      </SkyBand>

      {offer && (
        <div className="rs-offer" role="group" aria-label={copy.backToNormal}>
          <p className="rs-offer__text">{copy.backToNormal}</p>
          <Button variant="primary" onClick={() => r.setMode('normal')}>
            {copy.backToNormalYes}
          </Button>
          <Button variant="quiet" onClick={() => r.saveSettings({ ...r.settings, backToNormalDismissedOn: today })}>
            {copy.backToNormalLater}
          </Button>
        </div>
      )}

      {r.practices.length === 0 ? (
        <EmptySky today={today} />
      ) : nothingListed ? (
        <div className="rs-quiet">
          <p className="rs-lede">{mode === 'off' ? copy.quietDayOff : copy.resting}</p>
          <Button variant="ghost" icon="plus" onClick={onNew}>
            {copy.newPractice}
          </Button>
        </div>
      ) : (
        <div className="rs-list">
          {mode === 'off' && <p className="rs-lede rs-dayoff">{copy.dayOffLine}</p>}
          {page.recap && mode !== 'off' && (
            <div className="rs-recap">
              <p className="rs-eyebrow">{copy.recap}</p>
              {/* Kept in the layout once nothing is left for it, so the rows below never jump. */}
              <Button variant="primary" className="rs-bulk" onClick={() => r.putMarks(bulk)} disabled={bulk.length === 0} style={bulk.length === 0 ? { visibility: 'hidden' } : undefined}>
                {mode === 'low' ? copy.allALittle : copy.allAsPlanned}
              </Button>
            </div>
          )}
          {page.groups.map(group)}
          {page.alsoToday.length > 0 && (
            <section className="rs-section rs-group" aria-labelledby="rs-group-also">
              <h2 id="rs-group-also" className="rs-h2">
                {copy.alsoToday}
              </h2>
              <ul className="rs-rows">{page.alsoToday.map(row)}</ul>
            </section>
          )}
        </div>
      )}

      {page.yesterdayUnmarked.length > 0 && (
        <Go className="rs-yesterday" to={`/day/${page.yesterday}`}>
          {copy.yesterday(page.yesterdayUnmarked.length)} <span aria-hidden="true">→</span>
        </Go>
      )}
    </div>
  );
}

/** The mode button shows the current mode; one tap opens the three. */
function ModeControl({ mode, onChoose }: { mode: Mode; onChoose(m: Mode): void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="rs-mode"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button ref={button} type="button" className="rs-mode__button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="visually-hidden">{copy.modeLabel} </span>
        <span className="rs-mode__glyph" aria-hidden="true">
          {MODE_GLYPH[mode]}
        </span>{' '}
        {copy.modes[mode]}
      </button>
      {open && (
        <Segmented
          label={copy.aria.modePicker}
          options={MODES.map((m) => ({ value: m, label: copy.modes[m] }))}
          value={mode}
          onChange={(m) => {
            onChoose(m);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** An empty sky: one field for a name is all a practice needs; the rest has defaults. */
function EmptySky({ today }: { today: ISODate }) {
  const house = useHouse();
  const { col } = useCollection<Practice>(PRACTICE_PATH);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = validatePractice({ name, why: '', cadence: { kind: 'daily' }, startedOn: today, timeOfDay: 'anytime', measure: null }, today);
    if (!v.ok) {
      setError(v.errors.name);
      return;
    }
    // A name is all it takes; time of day and a measure stay absent until the practice's page sets them.
    col.put({ id: createId(), name: v.value.name, why: '', cadence: { kind: 'daily' }, startedOn: today, pausedOn: null });
    house.toast({ message: copy.toast.added(v.value.name), tone: 'accent' });
    setName('');
  };
  return (
    <form className="rs-empty" onSubmit={submit} noValidate>
      <p className="rs-lede">{copy.empty}</p>
      <TextField
        label={copy.nameLabel}
        placeholder={copy.namePlaceholder}
        value={name}
        maxLength={LIMITS.name}
        error={error}
        onChange={(e) => {
          setName(e.target.value);
          setError(undefined);
        }}
      />
      <Button variant="primary" icon="plus" type="submit">
        {copy.newPractice}
      </Button>
    </form>
  );
}
