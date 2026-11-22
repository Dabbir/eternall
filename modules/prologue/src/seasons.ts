import { addDays, cleanText, diffDays, finish, isValidISO, requireText, type FieldErrors, type ISODate, type Validation } from '@eternall/core';

/**
 * PROLOGUE's domain (docs/MODULES.md §7, docs/design/prologue.md): a season opens with hopes (acts),
 * and closes with an epilogue. "Let go" is a respected ending, never a failure. No percentages.
 */
export const SEASON_PATH = 'prologue/season';
export const HOPE_PATH = 'prologue/hope';
export const LIMITS = { name: 40, theme: 80, epilogue: 2000, title: 80, reflection: 600, hopes: 7 } as const;

export interface Season {
  id: string;
  name: string;
  theme: string;
  start: ISODate;
  end: ISODate;
  closedAt: string | null;
  epilogue: string;
}

export const HOPE_STATES = ['wings', 'stage', 'bow', 'rewritten', 'letGo'] as const;
export type HopeState = (typeof HOPE_STATES)[number];
export const STATE_LABEL: Record<HopeState, string> = { wings: 'In the wings', stage: 'On stage', bow: 'Taken a bow', rewritten: 'Rewritten', letGo: 'Let go' };
export const STATE_HINT: Record<HopeState, string> = {
  wings: 'Waiting: you haven’t started it yet.',
  stage: 'You’re working on it.',
  bow: 'It came true.',
  rewritten: 'It changed into something else.',
  letGo: 'You chose to let it go. That counts too.',
};
export const ENDINGS = ['bow', 'rewritten', 'letGo'] as const satisfies readonly HopeState[];

export interface Hope {
  id: string;
  seasonId: string;
  title: string;
  state: HopeState;
  reflection: string;
  ritualRef: string | null;
  peopleRefs: string[];
  /** Act order, 1-based. */
  act: number;
}

const NAMES = { north: ['Winter', 'Spring', 'Summer', 'Autumn'], south: ['Summer', 'Autumn', 'Winter', 'Spring'] } as const;

const lastDayOf = (y: number, monthIndex: number): ISODate => new Date(Date.UTC(y, monthIndex + 1, 0)).toISOString().slice(0, 10);
const firstDayOf = (y: number, monthIndex: number): ISODate => new Date(Date.UTC(y, monthIndex, 1)).toISOString().slice(0, 10);

/** The meteorological season containing `date` (Dec–Feb, Mar–May, Jun–Aug, Sep–Nov). */
export function meteorologicalSeason(date: ISODate, hemisphere: 'north' | 'south'): { name: string; start: ISODate; end: ISODate } {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  const q = Math.floor(((m + 1) % 12) / 3); // 0: Dec–Feb …
  const startYear = m === 11 ? y : q === 0 ? y - 1 : y;
  const startMonth = q === 0 ? 11 : q * 3 - 1;
  const endYear = q === 0 ? startYear + 1 : startYear;
  const endMonth = (startMonth + 2) % 12;
  return { name: `${NAMES[hemisphere][q]} ${startYear}`, start: firstDayOf(startYear, startMonth), end: lastDayOf(endYear, endMonth) };
}

export const sortSeasons = (list: readonly Season[]) => [...list].sort((a, b) => a.start.localeCompare(b.start));
export const contains = (s: Pick<Season, 'start' | 'end'>, date: ISODate) => date >= s.start && date <= s.end;

/** The season to show on stage: the open one containing today, else the newest one left open. */
/**
 * The season on stage: the open one containing today, else one left open after its end, else the
 * next one already planned (shown "in rehearsal" until its first day).
 */
export function currentSeason(seasons: readonly Season[], today: ISODate): Season | null {
  const sorted = sortSeasons(seasons).filter((s) => !s.closedAt);
  const begun = sorted.filter((s) => s.start <= today);
  return begun.find((s) => contains(s, today)) ?? begun.at(-1) ?? sorted.find((s) => s.start > today) ?? null;
}

export const inRehearsal = (s: Season, today: ISODate) => s.start > today;

export const isOverdue = (s: Season, today: ISODate) => !s.closedAt && today > s.end;
export const canClose = (s: Season, today: ISODate) => !s.closedAt && today >= addDays(s.end, -14);
export const daysRemaining = (s: Season, today: ISODate) => Math.max(0, diffDays(today, s.end));

export const hopesOf = (hopes: readonly Hope[], seasonId: string) => hopes.filter((h) => h.seasonId === seasonId).sort((a, b) => a.act - b.act);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);

export interface SeasonInput {
  name: string;
  theme: string;
  start: string;
  end: string;
}

export function validateSeason(input: SeasonInput, others: readonly Season[]): Validation<Pick<Season, 'name' | 'theme' | 'start' | 'end'>, keyof SeasonInput> {
  const errors: FieldErrors<keyof SeasonInput> = {};
  const name = requireText(input.name, LIMITS.name, 'A season');
  if (name.error) errors.name = name.value ? name.error : 'A season needs a name.';
  const theme = cleanText(input.theme);
  if (theme.length > LIMITS.theme) errors.theme = `Keep the theme under ${LIMITS.theme} characters.`;
  if (!isValidISO(input.start)) errors.start = 'Enter a valid start date.';
  if (!isValidISO(input.end)) errors.end = 'Enter a valid end date.';
  else if (isValidISO(input.start)) {
    const len = diffDays(input.start, input.end);
    if (len < 7) errors.end = 'A season lasts at least a week.';
    else if (len > 366) errors.end = 'A season lasts a year at most.';
    else {
      const clash = others.find((o) => input.start <= o.end && input.end >= o.start);
      if (clash) errors.start = `This overlaps ${clash.name}. Seasons don’t overlap.`;
    }
  }
  return finish(errors, () => ({ name: name.value, theme, start: input.start, end: input.end }));
}

export interface HopeInput {
  title: string;
  state: string;
  reflection: string;
}

export function validateHope(input: HopeInput, siblings: number, isNew: boolean): Validation<Pick<Hope, 'title' | 'state' | 'reflection'>, keyof HopeInput> {
  const errors: FieldErrors<keyof HopeInput> = {};
  const title = requireText(input.title, LIMITS.title, 'A hope');
  if (title.error) errors.title = title.value ? title.error : 'A hope needs a few words.';
  else if (isNew && siblings >= LIMITS.hopes) errors.title = `A season holds only a few acts. Seven is the most; let one go or close the season first.`;
  if (!(HOPE_STATES as readonly string[]).includes(input.state)) errors.state = 'Choose where it stands.';
  const reflection = cleanText(input.reflection);
  if (reflection.length > LIMITS.reflection) errors.reflection = `Keep it under ${LIMITS.reflection} characters.`;
  return finish(errors, () => ({ title: title.value, state: input.state as HopeState, reflection }));
}

/** For ALMANACK and the lifeline line. */
export function prologueStats(seasons: readonly Season[], hopes: readonly Hope[]) {
  return {
    closed: seasons.filter((s) => s.closedAt).length,
    bows: hopes.filter((h) => h.state === 'bow').length,
    letGo: hopes.filter((h) => h.state === 'letGo').length,
  };
}

export const onStageCount = (hopes: readonly Hope[], seasonId: string) => hopes.filter((h) => h.seasonId === seasonId && h.state === 'stage').length;
