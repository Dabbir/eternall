import { useState, type FormEvent } from 'react';
import { createId, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Segmented, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { allAsPlanned, frontPage, tapTier } from '../front';
import { offerBackToNormal, type Mode } from '../modes';
import { LIMITS, PRACTICE_PATH, markId, tierOf, validatePractice, weekdayOf, type Practice, type Tier } from '../practices';
import { sunPosition } from '../sky';
import { Lit } from './Ceremony';
import { MODE_GLYPH, TIER_GLYPH } from './glyphs';
import { SunArc } from './SunArc';
import { useNow, useRoutine, type Routine } from './useRoutine';

const TIERS: readonly Tier[] = ['minimum', 'target', 'more'];
const MODES: readonly Mode[] = ['normal', 'low', 'off'];

/** The amount a tier stands for, when the practice has a measure ("10 menit"). */
function amountHint(p: Practice, tier: Tier): string | null {
  const m = p.measure;
  if (!m) return null;
  if (tier === 'minimum') return copy.amount.exact(m.minimum, m.unit);
  if (tier === 'target') return copy.amount.exact(m.target, m.unit);
  return copy.amount.more(m.target, m.unit);
}

/**
 * The front page (spec §4.3–§4.5b): the day and its part, the sun's arc, the mode, and what is for now.
 * One tap lights a practice; the evening turns into the day's recap.
 */
export function Today() {
  const house = useHouse();
  const r = useRoutine();
  const now = useNow();
  const page = frontPage({ practices: r.practices, marks: r.marks, modes: r.modes, dayModes: r.dayModes, now, dayEndsAt: r.settings.dayEndsAt });
  const { today, mode } = page;
  const offer = offerBackToNormal(today, r.modes, r.settings.backToNormalDismissedOn);
  const bulk = allAsPlanned(page, r.marks);

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
              <Chip practice={p} today={today} routine={r} onTap={() => tap(p)} />
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
        <a
          className="rs-yesterday"
          href={house.href(`/day/${page.yesterday}`)}
          onClick={(e) => {
            e.preventDefault();
            house.navigate(house.href(`/day/${page.yesterday}`));
          }}
        >
          {copy.yesterday(page.yesterdayUnmarked.length)} <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}

/** A chip is one tap: unmarked lights it at the mode's tier, marked unmarks it. The other tiers sit right after it. */
function Chip({ practice: p, today, routine: r, onTap }: { practice: Practice; today: ISODate; routine: Routine; onTap(): void }) {
  const mark = r.idx.get(markId(p.id, today));
  const tier = mark ? tierOf(mark) : null;
  return (
    <span className={`rs-chip ${tier ? `is-lit rs-chip--${tier}` : ''}`}>
      <button type="button" className="rs-chip__main" aria-pressed={!!tier} onClick={onTap}>
        <span className="rs-chip__name">{p.name}</span>
        {tier && (
          <>
            {' '}
            <span className="rs-chip__glyph" aria-hidden="true">
              {TIER_GLYPH[tier]}
            </span>{' '}
            <span className="rs-chip__tier">{copy.tiers[tier]}</span>
          </>
        )}
      </button>
      {tier && (
        <span className="rs-tiers" role="group" aria-label={copy.aria.tierChoice}>
          {TIERS.filter((t) => t !== tier).map((t) => {
            const hint = amountHint(p, t);
            return (
              <button key={t} type="button" className={`rs-tier rs-tier--${t}`} onClick={() => r.setTier(p, today, t)}>
                <span aria-hidden="true">{TIER_GLYPH[t]}</span> {copy.tiers[t]}
                {hint && <span className="rs-tier__hint"> · {hint}</span>}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

/** The mode button shows the current mode; one tap opens the three. */
function ModeControl({ mode, onChoose }: { mode: Mode; onChoose(m: Mode): void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-mode">
      <button type="button" className="rs-mode__button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
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
    col.put({ id: createId(), pausedOn: null, ...v.value });
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
