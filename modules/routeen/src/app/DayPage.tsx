import { useEffect } from 'react';
import type { ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Segmented } from '@eternall/ui';
import { copy } from '../copy';
import { dayState } from '../days';
import { tapTier } from '../front';
import type { Mode } from '../modes';
import { isActiveOn, markId, type Practice } from '../practices';
import { Chip } from './Chip';
import { MODE_GLYPH } from './glyphs';
import { Go } from './Go';
import { dayName } from './Tile';
import type { Routine } from './useRoutine';

const MODES: readonly Mode[] = ['normal', 'low', 'off'];
const byStart = (a: Practice, b: Practice) => a.startedOn.localeCompare(b.startedOn) || a.name.localeCompare(b.name);

/**
 * One day of the sky (spec §4.6, §4.10): that day's practices, each one tap to light or unlight, and
 * "That day:" its own mode, which never changes the running one. A day still ahead opens Today instead.
 */
export function DayPage({ date, routine: r }: { date: ISODate; routine: Routine }) {
  const house = useHouse();
  const ahead = date > r.today;
  useEffect(() => {
    if (ahead) house.navigate(house.href('/'), { replace: true });
  }, [ahead, house]);
  if (ahead) return null;

  const mode = r.modeOf(date);
  const list = r.practices.filter((p) => isActiveOn(p, date) || r.idx.has(markId(p.id, date))).sort(byStart);
  const tap = (p: Practice) => r.setTier(p, date, r.idx.has(markId(p.id, date)) ? null : tapTier(mode));

  return (
    <div className={`rs-day rs-mode--${mode}`} data-mode={mode}>
      <header className="rs-head">
        <p className="rs-eyebrow">
          <span aria-hidden="true">{MODE_GLYPH[mode]}</span> {copy.modes[mode]}
        </p>
        <h1 className="rs-title">{dayName(date)}</h1>
      </header>

      {list.length === 0 ? (
        <p className="rs-lede">{copy.day.nothing}</p>
      ) : (
        <ul className="rs-chips">
          {list.map((p) => {
            const state = dayState(p, date, r.idx, r.modeOf, r.today);
            return (
              <li key={p.id}>
                <Chip practice={p} date={date} routine={r} state={state} note={copy.dayState[state]} onTap={() => tap(p)} />
              </li>
            );
          })}
        </ul>
      )}

      {date !== r.today && (
        <section className="rs-section rs-thatday">
          <Segmented label={copy.day.thatDay} hideLabel={false} options={MODES.map((m) => ({ value: m, label: copy.modes[m] }))} value={mode} onChange={(m) => r.setDayMode(date, m)} />
        </section>
      )}

      <p className="rs-back">
        <Go to="/sky">
          <span aria-hidden="true">←</span> {copy.day.toSky}
        </Go>
      </p>
    </div>
  );
}
