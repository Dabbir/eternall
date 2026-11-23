import {
  addDays,
  addYears,
  diffDays,
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

export const LETTER_PATH = 'envoi/letter';
export const DRAFT_PATH = 'envoi/draft';

export const LIMITS = { title: 80, body: 20_000, maxYearsAhead: 120 } as const;

export interface Letter {
  id: string;
  title: string;
  body: string;
  sealedOn: ISODate;
  opensOn: ISODate;
  /** SHA-256 of the sealed contents; proves the letter is unchanged when opened. */
  fingerprint: string;
  openedAt: string | null;
}

export interface LetterDraft {
  id: 'current';
  title: string;
  body: string;
  opensOn: string;
}

export type LetterStatus = 'sealed' | 'ready' | 'opened';

export function letterStatus(l: Letter, today: ISODate): LetterStatus {
  if (l.openedAt) return 'opened';
  return parseISO(l.opensOn) <= parseISO(today) ? 'ready' : 'sealed';
}

export const daysUntilOpen = (l: Letter, today: ISODate) => Math.max(0, diffDays(today, l.opensOn));

/** Fraction (0–1) of the waiting period already elapsed. */
export function sealProgress(l: Letter, today: ISODate): number {
  const total = diffDays(l.sealedOn, l.opensOn);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, diffDays(l.sealedOn, today) / total));
}

const canonical = (l: Pick<Letter, 'title' | 'body' | 'sealedOn' | 'opensOn'>) => JSON.stringify([l.title, l.body, l.sealedOn, l.opensOn]);

export async function fingerprintOf(l: Pick<Letter, 'title' | 'body' | 'sealedOn' | 'opensOn'>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(l)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySeal(l: Letter): Promise<boolean> {
  return (await fingerprintOf(l)) === l.fingerprint;
}

/** Ready first, then soonest sealed, then most recently opened. */
export function sortLetters(list: readonly Letter[], today: ISODate): Letter[] {
  const rank: Record<LetterStatus, number> = { ready: 0, sealed: 1, opened: 2 };
  return list.toSorted((a, b) => {
    const sa = letterStatus(a, today);
    const sb = letterStatus(b, today);
    if (sa !== sb) return rank[sa] - rank[sb];
    if (sa === 'opened') return (b.openedAt ?? '').localeCompare(a.openedAt ?? '');
    return a.opensOn.localeCompare(b.opensOn);
  });
}

/** A sealed letter should outlive at least one night. */
export const earliestOpening = (today: ISODate): ISODate => addDays(today, 1);

/** The furthest a letter may wait: the lifeline horizon, or 120 years without a profile. */
export function latestOpening(profile: HouseProfile | null, today: ISODate): ISODate {
  return profile ? horizonEnd(profile.birthDate, profile.horizonYears) : addYears(today, LIMITS.maxYearsAhead);
}

export interface LetterInput {
  title: string;
  body: string;
  opensOn: string;
}

export function validateLetter(
  input: LetterInput,
  profile: HouseProfile | null,
  today: ISODate,
): Validation<Pick<Letter, 'title' | 'body' | 'opensOn'>, keyof LetterInput> {
  const errors: FieldErrors<keyof LetterInput> = {};
  const title = requireText(input.title, LIMITS.title, 'Title');
  if (title.error) errors.title = title.error;
  const body = requireText(input.body, LIMITS.body, 'Your letter');
  if (body.error) errors.body = body.error;
  const last = latestOpening(profile, today);
  if (!isValidISO(input.opensOn)) errors.opensOn = 'Choose an opening date.';
  else if (parseISO(input.opensOn) < parseISO(earliestOpening(today))) errors.opensOn = 'A letter must open tomorrow or later.';
  else if (parseISO(input.opensOn) > parseISO(last)) errors.opensOn = profile ? 'That’s beyond the edge of your lifeline.' : 'That’s more than 120 years away.';
  return finish(errors, () => ({ title: title.value, body: body.value, opensOn: input.opensOn }));
}
