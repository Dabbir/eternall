import {
  addYears,
  cleanText,
  finish,
  horizonEnd,
  isValidISO,
  parseISO,
  requireText,
  type FieldErrors,
  type HouseProfile,
  type ISODate,
  type Validation,
} from '@eternall/core';

export const CHAPTER_PATH = 'folio/chapter';
export const LIMITS = { title: 60, note: 400 } as const;

/** Bookcloth palette: validated for colour-vision deficiency in light and dark (docs/design/folio.md §2). */
export const CLOTHS = [
  { id: 1, name: 'Ochre', color: '#a8760c' },
  { id: 2, name: 'Cobalt', color: '#2f6fca' },
  { id: 3, name: 'Madder', color: '#c2452f' },
  { id: 4, name: 'Viridian', color: '#22906a' },
  { id: 5, name: 'Violet', color: '#9b45b0' },
  { id: 6, name: 'Rose', color: '#d4607f' },
] as const;
export type ClothId = (typeof CLOTHS)[number]['id'];
export const clothColor = (id: number) => CLOTHS.find((c) => c.id === id)?.color ?? CLOTHS[0].color;
export const isCloth = (v: unknown): v is ClothId => typeof v === 'number' && CLOTHS.some((c) => c.id === v);

export interface Chapter {
  id: string;
  title: string;
  start: ISODate;
  /** null = still being written. */
  end: ISODate | null;
  cloth: ClothId;
  note: string;
}

/** Ongoing chapters end today for overlap and painting purposes. */
export const effectiveEnd = (c: Pick<Chapter, 'end'>, today: ISODate): ISODate => c.end ?? today;

export function chapterAt(chapters: readonly Chapter[], date: ISODate, today: ISODate): Chapter | null {
  const d = parseISO(date);
  let found: Chapter | null = null;
  for (const ch of chapters) {
    if (d >= parseISO(ch.start) && d <= parseISO(effectiveEnd(ch, today)) && (!found || ch.start > found.start)) found = ch;
  }
  return found;
}

export const sortChapters = (list: readonly Chapter[]) => [...list].sort((a, b) => a.start.localeCompare(b.start));

export interface ChapterInput {
  title: string;
  start: string;
  end: string | null;
  cloth: number;
  note: string;
}

export function validateChapter(
  input: ChapterInput,
  others: readonly Chapter[],
  profile: HouseProfile | null,
  today: ISODate,
): Validation<Omit<Chapter, 'id'>, keyof ChapterInput> {
  const errors: FieldErrors<keyof ChapterInput> = {};
  const title = requireText(input.title, LIMITS.title, 'Title');
  if (title.error) errors.title = title.error;
  const note = cleanText(input.note);
  if (note.length > LIMITS.note) errors.note = `Keep the note under ${LIMITS.note} characters.`;
  if (!isCloth(input.cloth)) errors.cloth = 'Choose a cloth.';

  const first = profile?.birthDate ?? addYears(today, -120);
  const last = profile ? horizonEnd(profile.birthDate, profile.horizonYears) : addYears(today, 120);
  if (!isValidISO(input.start)) errors.start = 'Enter a valid start date.';
  else if (parseISO(input.start) < parseISO(first)) errors.start = profile ? 'A chapter can’t begin before you do.' : 'That’s too far back.';
  else if (parseISO(input.start) > parseISO(last)) errors.start = 'That’s beyond the edge of your lifeline.';

  if (input.end !== null) {
    if (!isValidISO(input.end)) errors.end = 'Enter a valid end date.';
    else if (!errors.start && parseISO(input.end) < parseISO(input.start)) errors.end = 'A chapter must end after it begins.';
    else if (parseISO(input.end) > parseISO(last)) errors.end = 'That’s beyond the edge of your lifeline.';
  } else if (!errors.start && parseISO(input.start) > parseISO(today)) {
    errors.end = 'A chapter that hasn’t started can’t be ongoing — give it an end date.';
  }

  if (!errors.start && !errors.end) {
    const s = parseISO(input.start);
    const e = parseISO(input.end ?? today);
    const clash = others.find((o) => parseISO(o.start) <= e && parseISO(effectiveEnd(o, today)) >= s);
    if (clash) errors.start = `Overlaps with “${clash.title}”.`;
  }

  return finish(errors, () => ({ title: title.value, start: input.start, end: input.end, cloth: input.cloth as ClothId, note }));
}
