import { isValidISO, todayISO, type ISODate } from '@eternall/core';

/**
 * ROUTEEN's sky (Langit Hari): the routine day, its part of day and its settings.
 * The routine day ends at `dayEndsAt` o'clock, so the small hours still belong to yesterday.
 */

export type Part = 'morning' | 'midday' | 'evening';

export const DEFAULT_DAY_ENDS_AT = 3;

const HOUR_MS = 3_600_000;

/** The routine day a moment belongs to: before `dayEndsAt` it is still yesterday. */
export function routineDay(now: Date, dayEndsAt: number): ISODate {
  return todayISO(new Date(now.getTime() - dayEndsAt * HOUR_MS));
}

/** Morning until 11:00, midday until 17:00, evening until the day ends. */
export function partOfDay(now: Date, dayEndsAt: number): Part {
  const h = now.getHours();
  if (h < dayEndsAt) return 'evening';
  if (h < 11) return 'morning';
  if (h < 17) return 'midday';
  return 'evening';
}

/** Where the sun stands across the routine day: 0 at its start, approaching 1 at its end. */
export function sunPosition(now: Date, dayEndsAt: number): number {
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const since = (((minutes - dayEndsAt * 60) % 1440) + 1440) % 1440;
  return since / 1440;
}

export const SETTINGS_PATH = 'refrain/settings';

export interface RouteenSettings {
  id: 'settings';
  dayEndsAt: number;
  backToNormalDismissedOn: ISODate | null;
}

/** Reads the stored settings record defensively: clamps the hour, drops a bad date. */
export function readSettings(raw: unknown): RouteenSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hour = r.dayEndsAt;
  const dayEndsAt = typeof hour === 'number' && Number.isInteger(hour) ? Math.min(5, Math.max(0, hour)) : DEFAULT_DAY_ENDS_AT;
  const dismissed = isValidISO(r.backToNormalDismissedOn) ? r.backToNormalDismissedOn : null;
  return { id: 'settings', dayEndsAt, backToNormalDismissedOn: dismissed };
}
