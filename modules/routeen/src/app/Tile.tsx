import type { ISODate } from '@eternall/core';
import { copy } from '../copy';
import { skyState, type DaySky } from '../days';
import { weekdayOf } from '../practices';
import { MODE_GLYPH, TIER_GLYPH } from './glyphs';

/** "Monday 23 November", from the catalogue. */
export const dayName = (date: ISODate): string => copy.dateLabel(copy.weekdays[weekdayOf(date)]!, Number(date.slice(8, 10)), copy.months[Number(date.slice(5, 7)) - 1]!);

/** What the tile says aloud: "Monday 23 November: lit, as planned". */
function spoken(sky: DaySky, today: ISODate, week: boolean): string {
  const state = skyState(sky, today);
  const parts: string[] = [];
  if (state === 'lit') parts.push(copy.tile.lit(copy.tiers[sky.light!]));
  else parts.push(copy.tile[state]);
  if (sky.mode === 'low') parts.push(copy.tile.low);
  if (sky.mode === 'off' && state !== 'rest') parts.push(copy.tile.rest);
  const name = dayName(sky.date);
  return copy.tile.label(week ? copy.tile.week(name) : name, parts.join(', '));
}

/**
 * One day of the sky (spec §4.6): the brightest tier kept (◐ ☀︎ ✺), the day's weather (☁︎ ✦), or nothing.
 * An expected day that passed with no light is `unlit`: dim, with a faint outline, never red and never a word.
 * Shapes carry the meaning; colour only supports them. Also the 2D fallback of the dome (Task 10).
 * `week` reads the tile as a whole week (a practice's strip), dated by its Monday.
 */
export function Tile({ sky, today, week = false }: { sky: DaySky; today?: ISODate; week?: boolean }) {
  // Without today, an expected day with no light reads as passed. A week strip passes this week's Monday.
  const now = today ?? '';
  const state = skyState(sky, now);
  const isToday = !week && sky.date === today;
  return (
    <span
      role="img"
      aria-label={spoken(sky, now, week)}
      className={`rs-tile rs-tile--${state} rs-tile--${sky.mode}${isToday ? ' is-today' : ''}`}
      data-state={state}
      data-mode={sky.mode}
      data-light={sky.light ?? undefined}
    >
      {sky.light && <span className="rs-tile__light">{TIER_GLYPH[sky.light]}</span>}
      {sky.mode !== 'normal' && <span className="rs-tile__mode">{MODE_GLYPH[sky.mode]}</span>}
    </span>
  );
}
