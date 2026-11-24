import { useRef, useState, type FormEvent } from 'react';
import { createId, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Segmented, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { allAsPlanned, frontPage, tapTier } from '../front';
import { offerBackToNormal, type Mode } from '../modes';
import { LIMITS, PRACTICE_PATH, markId, validatePractice, weekdayOf, type Practice } from '../practices';
import { sunPosition } from '../sky';
import { Lit } from './Ceremony';
import { Chip } from './Chip';
import { MODE_GLYPH } from './glyphs';
import { Go } from './Go';
import { SunArc } from './SunArc';
import type { Routine } from './useRoutine';

const MODES: readonly Mode[] = ['normal', 'low', 'off'];

/**
 * The front page (spec §4.3–§4.5b): the day and its part, the sun's arc, the mode, and what is for now.
 * One tap lights a practice; the evening turns into the day's recap.
 */
export function Today({ routine: r, onNew }: { routine: Routine; onNew(): void }) {
  const house = useHouse();
  const { now } = r;
  const page = frontPage({ practices: r.practices, marks: r.marks, modes: r.modes, dayModes: r.dayModes, now, dayEndsAt: r.settings.dayEndsAt });
  const { today, mode } = page;
  const offer = offerBackToNormal(today, r.modes, r.settings.backToNormalDismissedOn);
  const bulk = allAsPlanned(page, r.marks);
  const nothingListed = mode === 'off' ? page.ifYouLike.length === 0 : page.forNow.length + page.notYet.length + page.alsoToday.length === 0;

  const tap = (p: Practice) => {
    if (r.idx.has(markId(p.id, today))) {
      r.setTier(p, today, null);
      return;
    }
    const tier = tapTier(mode);
    r.setTier(p, today, tier);
    house.ceremony(<Lit name={p.name} tier={tier} />, 700);
  };

  const chips = (title: string, list: readonly Practice[]) =>
    list.length > 0 && (
      <section className="rs-section" aria-label={title}>
        <h2 className="rs-h2">{title}</h2>
        <ul className="rs-chips">
          {list.map((p) => (
            <li key={p.id}>
              <Chip practice={p} date={today} routine={r} onTap={() => tap(p)} />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className={`rs-today rs-mode--${mode}`} data-mode={mode}>
      <header className="rs-head">
        <h1 className="rs-title">{copy.headline(copy.weekdays[weekdayOf(today)]!, copy.parts[page.part])}</h1>
        <SunArc position={sunPosition(now, r.settings.dayEndsAt)} />
        <ModeControl mode={mode} onChoose={r.setMode} />
      </header>

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
      ) : mode === 'off' ? (
        chips(copy.ifYouLike, page.ifYouLike)
      ) : page.recap ? (
        <>
          {chips(copy.recap, page.forNow)}
          {bulk.length > 0 && (
            <Button variant="primary" className="rs-bulk" onClick={() => r.putMarks(bulk)}>
              {mode === 'low' ? copy.allALittle : copy.allAsPlanned}
            </Button>
          )}
          {chips(copy.alsoToday, page.alsoToday)}
        </>
      ) : (
        <>
          {chips(copy.forNow, page.forNow)}
          {chips(copy.notYet, page.notYet)}
          {chips(copy.alsoToday, page.alsoToday)}
        </>
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
