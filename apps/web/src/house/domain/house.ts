import type { ImprintId } from '@eternall/core';
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
  /** Legacy (before ADR 0013): apps the person had hidden. Read until they choose in Settings → Apps. */
  hidden: string[];
  /** The apps the person switched on in Settings → Apps (ADR 0013). Absent until they first choose. */
  apps?: ImprintId[];
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

/** Apps that were renamed, old id → new id (docs/adr/0013: LEDGER became CASHEEN). Their data paths never moved. */
export const RENAMED_APPS: Readonly<Record<string, string>> = { ledger: 'casheen' };

/**
 * Settings saved before a rename still name the old app id (`hidden: ['ledger']`, `intro:ledger`).
 * Read them under the current id, so a choice made once is never asked again.
 */
export function withCurrentIds(settings: HouseSettings): HouseSettings {
  const id = (x: string) => RENAMED_APPS[x] ?? x;
  const hint = (x: string) => (x.startsWith('intro:') ? `intro:${id(x.slice(6))}` : x);
  const out: HouseSettings = { ...settings, hidden: [...new Set(settings.hidden.map(id))], dismissed: [...new Set(settings.dismissed.map(hint))] };
  if (settings.apps) out.apps = [...new Set(settings.apps.map((x) => id(x) as ImprintId))];
  return out;
}

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
