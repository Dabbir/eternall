import { useCallback } from 'react';
import type { ISODate } from '@eternall/core';
import { copy } from '../copy';
import type { DaySky } from '../days';
import { Tile, dayName } from './Tile';

/** The month a row of the year opens, if one starts in it (or it is the first row). */
function monthOf(week: readonly DaySky[], first: boolean): string | null {
  const opening = week.find((d) => d.date.endsWith('-01')) ?? (first ? week[0] : undefined);
  return opening ? copy.months[Number(opening.date.slice(5, 7)) - 1]! : null;
}

/**
 * The year as a strip of sky (ADR 0016): 52 weeks across, seven days down, on the sky's own gradient.
 * A lit day is its tier's shape in the accent, a day off a small star, an expected day with no light a
 * faint ring, a day with nothing planned nothing at all. Read as a table: a row per week, a cell per day,
 * each said in words. Scrolls sideways in its own box and opens at today.
 */
export function YearStrip({ year, today }: { year: DaySky[][]; today: ISODate }) {
  // A callback ref, so it opens at today every time it mounts (also on the way back from the dome).
  const box = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <div className="rs-year" ref={box} tabIndex={0} role="table" aria-label={copy.aria.skyGrid}>
      {year.map((w, i) => {
        const month = monthOf(w, i === 0);
        return (
          <div key={w[0]!.date} className={`rs-year__row${month ? ' is-month' : ''}`} role="row">
            <span className="rs-year__month" role="rowheader">
              {month ?? <span className="visually-hidden">{copy.tile.week(dayName(w[0]!.date))}</span>}
            </span>
            {w.map((d) => (
              <span key={d.date} className="rs-year__cell" role="cell">
                <Tile sky={d} today={today} />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
