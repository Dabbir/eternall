import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, type ISODate } from '@eternall/core';
import { LookPicker, useHouse, type useAppLook } from '@eternall/kit';
import { DimensionToggle, Stage3D, themeColors } from '@eternall/stage';
import { Button, Segmented } from '@eternall/ui';
import { copy } from '../copy';
import { litDays, weekSky, yearSky, type DaySky } from '../days';
import { ROUTEEN_LOOKS } from '../look';
import { barStart, timeOf, weekdayOf, type Practice } from '../practices';
import { BodyIcon } from './Body';
import { Go } from './Go';
import { SkyBand } from './SkyBand';
import { Tile, dayName } from './Tile';
import { YearStrip } from './YearStrip';
import type { SkyProps } from './skyScene';
import type { Routine } from './useRoutine';

const HOURS = [0, 1, 2, 3, 4, 5] as const;
const byStart = (a: Practice, b: Practice) => a.startedOn.localeCompare(b.startedOn) || a.name.localeCompare(b.name);

/**
 * The Sky (spec §4.6, §4.8): this week as seven tiles (Earlier / Later step through past weeks, so any
 * past day opens from here), the year as 52 rows with month bands and a count
 * of lit days (never a percentage or a streak), the practices, the sky's look and when the day ends.
 */
export function Sky({ routine: r, look }: { routine: Routine; look: ReturnType<typeof useAppLook> }) {
  const { today } = r;
  const house = useHouse();
  // The flat year is the default and the complete equivalent; the dome only behind the immersive gate.
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');
  const view = house.immersive.allowed ? dimension : '2d';
  const openDay = useCallback((date: ISODate) => house.navigate(house.href(`/day/${date}`)), [house]);
  // Weeks back from this one; the strip never goes past the current week.
  const [back, setBack] = useState(0);
  // "Later" (to this week) and "Back to this week" leave with the click, so focus goes to the week's heading.
  const weekHeading = useRef<HTMLHeadingElement>(null);
  const stepTo = (n: number) => {
    setBack(n);
    if (n === 0) weekHeading.current?.focus();
  };
  const start = addDays(barStart(today), -7 * back);
  const week = weekSky(r.practices, r.idx, start, today, r.modeOf);
  const weekTitle = back === 0 ? copy.sky.thisWeek : copy.sky.weekOf(dayName(start));
  const year = useMemo(() => yearSky(r.practices, r.idx, today, r.modeOf), [r.practices, r.idx, today, r.modeOf]);
  const practices = [...r.practices].sort(byStart);
  // Removed practices keep their marks (Undo, export), but only practices still here light the count.
  const here = new Set(r.practices.map((p) => p.id));
  const lit = litDays(r.marks.filter((m) => here.has(m.ritualId)), today.slice(0, 4));
  // Days each practice was lit (a mark a day), for its row.
  const litBy = new Map<string, number>();
  for (const m of r.marks) litBy.set(m.ritualId, (litBy.get(m.ritualId) ?? 0) + 1);
  return (
    <div className="rs-page rs-sky">
      <SkyBand size="short" mode={r.modeOf(today)} glow={1} label={copy.sky.bandYear}>
        <h1 className="rs-title">{copy.sky.title}</h1>
        <p className="rs-lede">{copy.sky.caption(lit)}</p>
      </SkyBand>

      <section className="rs-section" aria-labelledby="rs-week-title">
        <h2 id="rs-week-title" className="rs-h2" ref={weekHeading} tabIndex={-1}>
          {weekTitle}
        </h2>
        <div className="rs-week__nav">
          <Button variant="quiet" icon="left" onClick={() => stepTo(back + 1)}>
            {copy.sky.earlier}
          </Button>
          {back > 0 && (
            <>
              <Button variant="quiet" onClick={() => stepTo(back - 1)}>
                {copy.sky.later}
              </Button>
              <Button variant="quiet" onClick={() => stepTo(0)}>
                {copy.sky.backToThisWeek}
              </Button>
            </>
          )}
        </div>
        <ol className="rs-week" aria-label={weekTitle}>
          {week.map((d) => (
            <li key={d.date} className={d.date === today ? 'is-today' : undefined} aria-current={d.date === today ? 'date' : undefined}>
              {/* Seen, not read twice: the tile already says its full date aloud. */}
              <span className="rs-week__label" aria-hidden="true">
                {copy.weekdaysShort[weekdayOf(d.date)]} <span className="rs-week__date">{Number(d.date.slice(8, 10))}</span>
              </span>
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
        <div className="rs-year__view">
          <DimensionToggle value={view} onChange={setDimension} allowed={house.immersive.allowed} reason={house.immersive.reason} label2d={copy.sky.flat} label3d={copy.sky.dome} />
        </div>
        {view === '3d' ? (
          <Dome year={year} today={today} onOpen={openDay} onDowngrade={() => setDimension('2d')} />
        ) : (
          <YearStrip year={year} today={today} />
        )}
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
                <Go className="rs-practices__row" to={`/practice/${p.id}`}>
                  <BodyIcon kind={litBy.has(p.id) ? 'target' : 'unlit'} className="rs-practices__body" />
                  <span className="rs-practices__name">{p.name}</span>
                  <span className="rs-practices__meta">
                    {copy.times[timeOf(p)]} · {copy.sky.litDays(litBy.get(p.id) ?? 0)}
                    {p.pausedOn && ` · ${copy.sky.paused}`}
                  </span>
                </Go>
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
              {(['unlit', 'minimum', 'target', 'more'] as const).map((t) => (
                <BodyIcon key={t} kind={t} className="rs-sample__body" />
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

const loadSky = () => import('./skyScene');

/** The year as a dome (immersive only): the same days as the flat year, past and present, in the sky's own colours. */
function Dome({ year, today, onOpen, onDowngrade }: { year: DaySky[][]; today: ISODate; onOpen(date: ISODate): void; onDowngrade(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<SkyProps['colors'] | null>(null);
  useEffect(() => {
    if (ref.current) {
      const c = themeColors(ref.current, ['ink', 'accent']);
      setColors({ paper: c.paper, ink: c.ink, accent: c.accent });
    }
  }, []);
  const days = useMemo(() => year.flat().filter((d) => !d.future).map(({ date, light, mode }) => ({ date, light, mode })), [year]);
  const props = useMemo<SkyProps | null>(() => (colors ? { days, colors, onOpen } : null), [colors, days, onOpen]);
  const marked = days.filter((d) => d.light || d.mode === 'off');
  const byDate = new Map(year.flat().map((d) => [d.date, d]));
  return (
    <div ref={ref} className="rs-dome">
      {/* The hint sits on the stage; the days list below shows when a link has keyboard focus. */}
      <div className="rs-dome__frame">
        {props && <Stage3D load={loadSky} props={props} label={copy.sky.domeLabel} onDowngrade={onDowngrade} className="rs-dome__stage" />}
        <p className="rs-dome__hint" aria-hidden="true">
          {copy.sky.domeHint}
          <span className="rs-dome__zoom"> · {copy.sky.domeZoom}</span>
        </p>
      </div>
      <ul className="rs-dome__days" aria-label={copy.sky.domeDays}>
        {marked.map((d) => (
          <li key={d.date}>
            <Go to={`/day/${d.date}`}>
              <Tile sky={byDate.get(d.date)!} today={today} />
            </Go>
          </li>
        ))}
      </ul>
    </div>
  );
}
