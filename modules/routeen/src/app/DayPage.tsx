import { useEffect } from 'react';
import type { ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Segmented } from '@eternall/ui';
import { copy } from '../copy';
import { dayState } from '../days';
import { groupByTime, tapTier } from '../front';
import type { Mode } from '../modes';
import { isActiveOn, markId, tierOf, type Practice, type Tier } from '../practices';
import { PracticeRow } from './PracticeRow';
import { SkyBand } from './SkyBand';
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
  const tierNow = (p: Practice): Tier | null => {
    const m = r.idx.get(markId(p.id, date));
    return m ? tierOf(m) : null;
  };
  const states = list.map((p) => dayState(p, date, r.idx, r.modeOf, r.today));
  const litCount = list.filter((p) => tierNow(p)).length;
  const expected = states.filter((st) => st.startsWith('lit') || st === 'unlit' || st === 'open').length;
  const glow = expected ? litCount / expected : 0;
  const kindOf = (id: string) => {
    const m = r.idx.get(markId(id, date));
    return m ? tierOf(m) : 'unlit';
  };
  const names = new Map(list.map((p) => [p.id, p.name]));
  const tap = (p: Practice) => r.setTier(p, date, tierNow(p) ? null : tapTier(mode));

  return (
    <div className={`rs-page rs-day rs-mode--${mode}`} data-mode={mode}>
      <SkyBand size="full" mode={mode} glow={glow} groups={groupByTime(list)} kindOf={kindOf} nameOf={(id) => names.get(id) ?? ''} label={copy.sky.bandDay(dayName(date), litCount)}>
        <p className="rs-eyebrow">
          <span aria-hidden="true">{MODE_GLYPH[mode]}</span> {copy.modes[mode]}
        </p>
        <h1 className="rs-title">{dayName(date)}</h1>
      </SkyBand>

      {list.length === 0 ? (
        <p className="rs-lede">{copy.day.nothing}</p>
      ) : (
        <ul className="rs-rows">
          {list.map((p) => {
            const state = dayState(p, date, r.idx, r.modeOf, r.today);
            return (
              <li key={p.id}>
                <PracticeRow practice={p} date={date} routine={r} state={state} note={copy.dayState[state]} onTap={() => tap(p)} onTier={(t) => r.setTier(p, date, tierNow(p) === t ? null : t)} />
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
