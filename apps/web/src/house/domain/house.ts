import {
  birthdayAt,
  cleanText,
  finish,
  horizonEnd,
  isValidISO,
  parseISO,
  requireText,
  type FieldErrors,
  type HouseProfile,
  type ISODate,
  type Tone,
  type Validation,
  isTone,
} from '@eternall/core';

export const PROFILE_PATH = 'house/profile';
export const SETTINGS_PATH = 'house/settings';
export const INSCRIPTION_PATH = 'house/inscription';

export const LIMITS = {
  name: 40,
  title: 80,
  inscriptionBody: 10_000,
  minHorizon: 50,
  maxHorizon: 120,
  maxAge: 120,
} as const;

export type ThemePreference = 'system' | 'light' | 'dark';
export type Lens = 'moments' | 'chapters' | 'plain';

export interface HouseSettings {
  id: 'prefs';
  theme: ThemePreference;
  lens: Lens;
  /** Never run 3D scenes, even when the device could. */
  flatPages: boolean;
  /** Suggestions and hints the person dismissed (never shown again). */
  dismissed: string[];
  /** Imprints the person turned off in the doors menu. */
  hidden: string[];
  autoLockMinutes: number;
  /** Deliver local reminders as system notifications when the app is open in the background. */
  systemNotifications: boolean;
}

export const DEFAULT_SETTINGS: HouseSettings = {
  id: 'prefs',
  theme: 'system',
  lens: 'moments',
  flatPages: false,
  dismissed: [],
  hidden: [],
  autoLockMinutes: 15,
  systemNotifications: false,
};

export interface Inscription {
  id: string;
  date: ISODate;
  title: string;
  body: string;
  tone: Tone;
  createdAt: string;
  updatedAt: string;
}

/* ---------- validation ---------- */

export interface ProfileInput {
  name: string;
  birthDate: string;
  horizonYears: number;
}

export function validateProfile(input: ProfileInput, today: ISODate): Validation<Pick<HouseProfile, 'name' | 'birthDate' | 'horizonYears'>, keyof ProfileInput> {
  const errors: FieldErrors<keyof ProfileInput> = {};
  const name = requireText(input.name, LIMITS.name, 'Your name');
  if (name.error) errors.name = name.error;

  if (!isValidISO(input.birthDate)) errors.birthDate = 'Enter a valid date.';
  else if (parseISO(input.birthDate) > parseISO(today)) errors.birthDate = 'Your birth date can’t be in the future.';
  else if (birthdayAt(input.birthDate, LIMITS.maxAge) <= parseISO(today)) errors.birthDate = `ETERNALL supports lives up to ${LIMITS.maxAge} years.`;

  const h = input.horizonYears;
  if (!Number.isInteger(h) || h < LIMITS.minHorizon || h > LIMITS.maxHorizon) {
    errors.horizonYears = `Choose between ${LIMITS.minHorizon} and ${LIMITS.maxHorizon} years.`;
  } else if (!errors.birthDate && parseISO(horizonEnd(input.birthDate, h)) < parseISO(today)) {
    errors.horizonYears = 'Your horizon is already behind you — extend it.';
  }

  return finish(errors, () => ({ name: name.value, birthDate: input.birthDate, horizonYears: h }));
}

export interface InscriptionInput {
  date: string;
  title: string;
  body: string;
  tone: string;
}

/** Inscriptions are for days lived. Without a profile, any date up to today is allowed. */
export function validateInscription(
  input: InscriptionInput,
  profile: HouseProfile | null,
  today: ISODate,
): Validation<Pick<Inscription, 'date' | 'title' | 'body' | 'tone'>, keyof InscriptionInput> {
  const errors: FieldErrors<keyof InscriptionInput> = {};
  const title = requireText(input.title, LIMITS.title, 'Title');
  if (title.error) errors.title = title.error;
  const body = cleanText(input.body);
  if (body.length > LIMITS.inscriptionBody) errors.body = `Keep it under ${LIMITS.inscriptionBody.toLocaleString('en-GB')} characters.`;
  if (!isValidISO(input.date)) errors.date = 'Enter a valid date.';
  else if (profile && parseISO(input.date) < parseISO(profile.birthDate)) errors.date = 'That’s before you were born.';
  else if (parseISO(input.date) > parseISO(today)) errors.date = 'Memories are for days already lived. Write a letter to the future in AMAZEEN’s Letters.';
  if (!isTone(input.tone)) errors.tone = 'Choose a tone.';
  return finish(errors, () => ({ date: input.date, title: title.value, body, tone: input.tone as Tone }));
}
