import { useState } from 'react';
import { addDays } from '@eternall/core';
import { LookPicker, type useAppLook } from '@eternall/kit';
import { Button, Segmented } from '@eternall/ui';
import { copy } from '../copy';
import { litDays, weekSky, yearSky, type DaySky } from '../days';
import { ROUTEEN_LOOKS } from '../look';
import { barStart, type Practice } from '../practices';
import { TIER_GLYPH } from './glyphs';
import { Go } from './Go';
import { Tile, dayName } from './Tile';
import type { Routine } from './useRoutine';

const HOURS = [0, 1, 2, 3, 4, 5] as const;
const byStart = (a: Practice, b: Practice) => a.startedOn.localeCompare(b.startedOn) || a.name.localeCompare(b.name);

/** The month a row of the year opens, if one starts in it (or it is the first row). */
function monthOf(week: readonly DaySky[], first: boolean): string | null {
  const opening = week.find((d) => d.date.endsWith('-01')) ?? (first ? week[0] : undefined);
  return opening ? copy.months[Number(opening.date.slice(5, 7)) - 1]! : null;
}

/**
 * The Sky (spec §4.6, §4.8): this week as seven tiles (Earlier / Later step through past weeks, so any
 * past day opens from here), the year as 52 rows with month bands and a count
 * of lit days (never a percentage or a streak), the practices, the sky's look and when the day ends.
 */
export function Sky({ routine: r, look }: { routine: Routine; look: ReturnType<typeof useAppLook> }) {
  const { today } = r;
  // Weeks back from this one; the strip never goes past the current week.
  const [back, setBack] = useState(0);
  const start = addDays(barStart(today), -7 * back);
  const week = weekSky(r.practices, r.idx, start, today, r.modeOf);
  const weekTitle = back === 0 ? copy.sky.thisWeek : copy.sky.weekOf(dayName(start));
  const year = yearSky(r.practices, r.idx, today, r.modeOf);
  const practices = [...r.practices].sort(byStart);
  // Removed practices keep their marks (Undo, export), but only practices still here light the count.
  const here = new Set(r.practices.map((p) => p.id));
  const lit = litDays(r.marks.filter((m) => here.has(m.ritualId)), today.slice(0, 4));
  return (
    <div className="rs-sky">
      <header className="rs-head">
        <h1 className="rs-title">{copy.sky.title}</h1>
        <p className="rs-lede">{copy.sky.caption(lit)}</p>
      </header>

      <section className="rs-section" aria-labelledby="rs-week-title">
        <h2 id="rs-week-title" className="rs-h2">
          {weekTitle}
        </h2>
        <div className="rs-week__nav">
          <Button variant="quiet" icon="left" onClick={() => setBack(back + 1)}>
            {copy.sky.earlier}
          </Button>
          {back > 0 && (
            <>
              <Button variant="quiet" onClick={() => setBack(back - 1)}>
                {copy.sky.later}
              </Button>
              <Button variant="quiet" onClick={() => setBack(0)}>
                {copy.sky.backToThisWeek}
              </Button>
            </>
          )}
        </div>
        <ol className="rs-week" aria-label={weekTitle}>
          {week.map((d) => (
            <li key={d.date} className={d.date === today ? 'is-today' : undefined} aria-current={d.date === today ? 'date' : undefined}>
              {d.future ? (
                <Tile sky={d} today={today} />
              ) : (
                <Go className="rs-week__day" to={`/day/${d.date}`}>
                  <Tile sky={d} today={today} />
                </Go>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="rs-section" aria-labelledby="rs-year-title">
        <h2 id="rs-year-title" className="rs-h2">
          {copy.sky.year}
        </h2>
        <div className="rs-year" role="table" aria-label={copy.aria.skyGrid}>
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
      </section>

      <section className="rs-section" aria-labelledby="rs-practices-title">
        <h2 id="rs-practices-title" className="rs-h2">
          {copy.sky.practices}
        </h2>
        {practices.length === 0 ? (
          <p className="rs-lede">{copy.sky.noPractices}</p>
        ) : (
          <ul className="rs-practices">
            {practices.map((p) => (
              <li key={p.id}>
                <Go to={`/practice/${p.id}`}>{p.name}</Go>
                {p.pausedOn && <span className="rs-practices__paused"> · {copy.sky.paused}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rs-section rs-look" aria-labelledby="rs-look-title">
        <h2 id="rs-look-title" className="rs-h2">
          {copy.sky.look}
        </h2>
        <p className="rs-lede">{copy.sky.lookNote}</p>
        <LookPicker
          spec={ROUTEEN_LOOKS}
          look={look.look}
          onChange={look.setLook}
          accentLegend={copy.sky.accent}
          sample={() => (
            <span className="rs-sample">
              {(['minimum', 'target', 'more'] as const).map((t) => (
                <span key={t} className={`rs-sample__glyph rs-tile--${t}`}>
                  {TIER_GLYPH[t]}
                </span>
              ))}
            </span>
          )}
        />
      </section>

      <section className="rs-section rs-dayends" aria-labelledby="rs-dayends-title">
        <h2 id="rs-dayends-title" className="rs-h2">
          {copy.sky.dayEnds}
        </h2>
        <Segmented
          label={copy.dayEndsAt}
          hideLabel={false}
          options={HOURS.map((h) => ({ value: String(h), label: copy.hour(h) }))}
          value={String(r.settings.dayEndsAt)}
          onChange={(h) => r.saveSettings({ ...r.settings, dayEndsAt: Number(h) })}
        />
        <p className="rs-hint">{copy.dayEndsAtHint}</p>
      </section>
    </div>
  );
}
