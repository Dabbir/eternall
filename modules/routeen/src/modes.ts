import { diffDays, type ISODate } from '@eternall/core';

/** Life modes: Normal, Low energy, Day off. Paths keep their `refrain/*` names (docs/adr/0014). */
export type Mode = 'normal' | 'low' | 'off';
export const MODE_PATH = 'refrain/mode';
/** Vault paths are lower case (`packages/vault/src/records.ts`), so not `dayMode`. */
export const DAY_MODE_PATH = 'refrain/day-mode';

/** A change of running mode, effective from a day. The id is that day, so a second change the same day overwrites. */
export interface ModeRecord {
  id: ISODate;
  mode: Mode;
  from: ISODate;
}
/** One day carrying its own mode, apart from the running one. */
export interface DayModeRecord {
  id: ISODate;
  date: ISODate;
  mode: Mode;
}

const latest = (date: ISODate, modes: readonly ModeRecord[]): ModeRecord | null =>
  modes.reduce<ModeRecord | null>((best, m) => (m.from <= date && (!best || m.from > best.from) ? m : best), null);

/** The mode running on a day: the latest change on or before it, else Normal. */
export const runningMode = (date: ISODate, modes: readonly ModeRecord[]): Mode => latest(date, modes)?.mode ?? 'normal';

/** The mode a day is lived in: its own override, else the running mode. */
export const modeOn = (date: ISODate, modes: readonly ModeRecord[], dayModes: readonly DayModeRecord[]): Mode =>
  dayModes.find((d) => d.date === date)?.mode ?? runningMode(date, modes);

export type ModeOf = (date: ISODate) => Mode;
export const modeOfFn = (modes: readonly ModeRecord[], dayModes: readonly DayModeRecord[]): ModeOf => (date) => modeOn(date, modes, dayModes);

export const modeRecord = (today: ISODate, mode: Mode): ModeRecord => ({ id: today, from: today, mode });

/** Setting one day's mode: an override equal to the running mode is no override, so it is removed. */
export function dayModeChange(date: ISODate, mode: Mode, modes: readonly ModeRecord[]): { put: DayModeRecord } | { remove: ISODate } {
  return mode === runningMode(date, modes) ? { remove: date } : { put: { id: date, date, mode } };
}

/** Choosing the mode already running, with no override today, changes nothing (so the Back-to-Normal clock keeps running). */
export const isModeUnchanged = (today: ISODate, mode: Mode, modes: readonly ModeRecord[], dayModes: readonly DayModeRecord[]): boolean =>
  mode === runningMode(today, modes) && !dayModes.some((d) => d.date === today);

/** Offer "Back to Normal" once a non-Normal mode has run three days or more, and not again once dismissed today. */
export function offerBackToNormal(today: ISODate, modes: readonly ModeRecord[], dismissedOn: ISODate | null): boolean {
  const run = latest(today, modes);
  return !!run && run.mode !== 'normal' && diffDays(run.from, today) >= 3 && dismissedOn !== today;
}
