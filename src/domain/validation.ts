import { addDays, birthdayAt, horizonEnd, isValidISO, parseISO } from './time';
import {
  DATA_VERSION,
  INKS,
  LIMITS,
  TONES,
  type AppData,
  type Capsule,
  type Chapter,
  type ISODate,
  type Ink,
  type Inscription,
  type Lens,
  type Profile,
  type ThemePreference,
  type Tone,
} from './types';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Validation<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

const finish = <T, K extends string>(errors: FieldErrors<K>, value: () => T): Validation<T, K> =>
  Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: value() };

/** Trims and collapses control characters that have no business in user text. */
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function requireText(raw: string, max: number, label: string): { value: string; error?: string } {
  const value = cleanText(raw);
  if (!value) return { value, error: `${label} can’t be empty.` };
  if (value.length > max) return { value, error: `${label} must be ${max} characters or fewer.` };
  return { value };
}

/* ---------- Profile ---------- */

export interface ProfileInput {
  name: string;
  birthDate: string;
  horizonYears: number;
}

export function validateProfile(
  input: ProfileInput,
  today: ISODate,
): Validation<Omit<Profile, 'createdAt'>, keyof ProfileInput> {
  const errors: FieldErrors<keyof ProfileInput> = {};
  const name = requireText(input.name, LIMITS.name, 'Your name');
  if (name.error) errors.name = name.error;

  if (!isValidISO(input.birthDate)) {
    errors.birthDate = 'Enter a valid date.';
  } else if (parseISO(input.birthDate) > parseISO(today)) {
    errors.birthDate = 'Your birth date can’t be in the future.';
  } else if (birthdayAt(input.birthDate, LIMITS.maxAge) <= parseISO(today)) {
    errors.birthDate = `ETERNALL supports lives up to ${LIMITS.maxAge} years.`;
  }

  const h = input.horizonYears;
  if (!Number.isInteger(h) || h < LIMITS.minHorizon || h > LIMITS.maxHorizon) {
    errors.horizonYears = `Choose between ${LIMITS.minHorizon} and ${LIMITS.maxHorizon} years.`;
  } else if (!errors.birthDate && parseISO(horizonEnd(input.birthDate, h)) < parseISO(today)) {
    errors.horizonYears = 'Your horizon is already behind you — extend it.';
  }

  return finish(errors, () => ({ name: name.value, birthDate: input.birthDate, horizonYears: h }));
}

/* ---------- Inscriptions ---------- */

export interface InscriptionInput {
  date: string;
  title: string;
  body: string;
  tone: string;
}

export function validateInscription(
  input: InscriptionInput,
  profile: Profile,
  today: ISODate,
): Validation<Pick<Inscription, 'date' | 'title' | 'body' | 'tone'>, keyof InscriptionInput> {
  const errors: FieldErrors<keyof InscriptionInput> = {};
  const title = requireText(input.title, LIMITS.title, 'Title');
  if (title.error) errors.title = title.error;
  const body = cleanText(input.body);
  if (body.length > LIMITS.inscriptionBody) {
    errors.body = `Keep it under ${LIMITS.inscriptionBody.toLocaleString('en-GB')} characters.`;
  }
  if (!isValidISO(input.date)) errors.date = 'Enter a valid date.';
  else if (parseISO(input.date) < parseISO(profile.birthDate)) errors.date = 'That’s before you were born.';
  else if (parseISO(input.date) > parseISO(today)) errors.date = 'Memories are for days already lived. Seal a capsule for the future.';
  if (!isTone(input.tone)) errors.tone = 'Choose a tone.';

  return finish(errors, () => ({ date: input.date, title: title.value, body, tone: input.tone as Tone }));
}

/* ---------- Capsules ---------- */

export interface CapsuleInput {
  title: string;
  body: string;
  opensOn: string;
}

/** Earliest a capsule may open: a sealed letter should outlive at least one night. */
export const earliestOpening = (today: ISODate): ISODate => addDays(today, 1);

export function validateCapsule(
  input: CapsuleInput,
  profile: Profile,
  today: ISODate,
): Validation<Pick<Capsule, 'title' | 'body' | 'opensOn'>, keyof CapsuleInput> {
  const errors: FieldErrors<keyof CapsuleInput> = {};
  const title = requireText(input.title, LIMITS.title, 'Title');
  if (title.error) errors.title = title.error;
  const body = requireText(input.body, LIMITS.capsuleBody, 'Your letter');
  if (body.error) errors.body = body.error;
  const last = horizonEnd(profile.birthDate, profile.horizonYears);
  if (!isValidISO(input.opensOn)) errors.opensOn = 'Choose an opening date.';
  else if (parseISO(input.opensOn) < parseISO(earliestOpening(today))) errors.opensOn = 'A capsule must open tomorrow or later.';
  else if (parseISO(input.opensOn) > parseISO(last)) errors.opensOn = 'That’s beyond the edge of your lifeline.';

  return finish(errors, () => ({ title: title.value, body: body.value, opensOn: input.opensOn }));
}

/* ---------- Chapters ---------- */

export interface ChapterInput {
  title: string;
  start: string;
  end: string | null;
  ink: string;
  note: string;
}

/** Ongoing chapters are treated as ending today for overlap purposes. */
export const effectiveEnd = (c: Pick<Chapter, 'end'>, today: ISODate): ISODate => c.end ?? today;

export function validateChapter(
  input: ChapterInput,
  others: readonly Chapter[],
  profile: Profile,
  today: ISODate,
): Validation<Omit<Chapter, 'id'>, keyof ChapterInput> {
  const errors: FieldErrors<keyof ChapterInput> = {};
  const title = requireText(input.title, LIMITS.chapterTitle, 'Title');
  if (title.error) errors.title = title.error;
  const note = cleanText(input.note);
  if (note.length > LIMITS.chapterNote) errors.note = `Keep the note under ${LIMITS.chapterNote} characters.`;
  if (!isInk(input.ink)) errors.ink = 'Choose an ink.';

  const last = horizonEnd(profile.birthDate, profile.horizonYears);
  if (!isValidISO(input.start)) errors.start = 'Enter a valid start date.';
  else if (parseISO(input.start) < parseISO(profile.birthDate)) errors.start = 'A chapter can’t begin before you do.';
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

  return finish(errors, () => ({
    title: title.value,
    start: input.start,
    end: input.end,
    ink: input.ink as Ink,
    note,
  }));
}

/* ---------- Whole-archive validation (storage + import) ---------- */

export const isTone = (v: unknown): v is Tone => typeof v === 'string' && (TONES as readonly string[]).includes(v);
export const isInk = (v: unknown): v is Ink => typeof v === 'string' && (INKS as readonly string[]).includes(v);
const isTheme = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';
const isLens = (v: unknown): v is Lens => v === 'moments' || v === 'chapters' || v === 'plain';
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = Infinity): v is string => typeof v === 'string' && v.length <= max;
const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const isTimestamp = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

export class ArchiveError extends Error {}

function fail(path: string, why: string): never {
  throw new ArchiveError(`${path}: ${why}`);
}

function readProfile(v: unknown): Profile | null {
  if (v === null) return null;
  if (!isObj(v)) fail('profile', 'must be an object');
  if (!isStr(v.name, LIMITS.name) || !cleanText(v.name)) fail('profile.name', 'invalid');
  if (!isValidISO(v.birthDate)) fail('profile.birthDate', 'invalid date');
  const h = v.horizonYears;
  if (typeof h !== 'number' || !Number.isInteger(h) || h < LIMITS.minHorizon || h > LIMITS.maxHorizon) {
    fail('profile.horizonYears', 'out of range');
  }
  return {
    name: v.name,
    birthDate: v.birthDate,
    horizonYears: h,
    createdAt: isTimestamp(v.createdAt) ? v.createdAt : new Date().toISOString(),
  };
}

function readList<T>(v: unknown, path: string, read: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(v)) fail(path, 'must be a list');
  const seen = new Set<string>();
  return v.map((item, i) => {
    const out = read(item, `${path}[${i}]`) as T & { id: string };
    if (seen.has(out.id)) fail(`${path}[${i}].id`, 'duplicate id');
    seen.add(out.id);
    return out;
  });
}

function readInscription(v: unknown, p: string): Inscription {
  if (!isObj(v)) fail(p, 'must be an object');
  if (!isId(v.id)) fail(`${p}.id`, 'invalid');
  if (!isValidISO(v.date)) fail(`${p}.date`, 'invalid date');
  if (!isStr(v.title, LIMITS.title) || !cleanText(v.title)) fail(`${p}.title`, 'invalid');
  if (!isStr(v.body, LIMITS.inscriptionBody)) fail(`${p}.body`, 'invalid');
  if (!isTone(v.tone)) fail(`${p}.tone`, 'unknown tone');
  const now = new Date().toISOString();
  return {
    id: v.id,
    date: v.date,
    title: v.title,
    body: v.body,
    tone: v.tone,
    createdAt: isTimestamp(v.createdAt) ? v.createdAt : now,
    updatedAt: isTimestamp(v.updatedAt) ? v.updatedAt : now,
  };
}

function readCapsule(v: unknown, p: string): Capsule {
  if (!isObj(v)) fail(p, 'must be an object');
  if (!isId(v.id)) fail(`${p}.id`, 'invalid');
  if (!isStr(v.title, LIMITS.title) || !cleanText(v.title)) fail(`${p}.title`, 'invalid');
  if (!isStr(v.body, LIMITS.capsuleBody)) fail(`${p}.body`, 'invalid');
  if (!isValidISO(v.sealedOn)) fail(`${p}.sealedOn`, 'invalid date');
  if (!isValidISO(v.opensOn)) fail(`${p}.opensOn`, 'invalid date');
  if (parseISO(v.opensOn) <= parseISO(v.sealedOn)) fail(`${p}.opensOn`, 'must be after sealedOn');
  if (!isStr(v.fingerprint) || !/^[0-9a-f]{64}$/.test(v.fingerprint)) fail(`${p}.fingerprint`, 'invalid');
  if (v.openedAt !== null && !isTimestamp(v.openedAt)) fail(`${p}.openedAt`, 'invalid');
  return {
    id: v.id,
    title: v.title,
    body: v.body,
    sealedOn: v.sealedOn,
    opensOn: v.opensOn,
    fingerprint: v.fingerprint,
    openedAt: v.openedAt as string | null,
  };
}

function readChapter(v: unknown, p: string): Chapter {
  if (!isObj(v)) fail(p, 'must be an object');
  if (!isId(v.id)) fail(`${p}.id`, 'invalid');
  if (!isStr(v.title, LIMITS.chapterTitle) || !cleanText(v.title)) fail(`${p}.title`, 'invalid');
  if (!isValidISO(v.start)) fail(`${p}.start`, 'invalid date');
  if (v.end !== null && !isValidISO(v.end)) fail(`${p}.end`, 'invalid date');
  if (v.end !== null && parseISO(v.end as string) < parseISO(v.start)) fail(`${p}.end`, 'before start');
  if (!isInk(v.ink)) fail(`${p}.ink`, 'unknown ink');
  if (!isStr(v.note, LIMITS.chapterNote)) fail(`${p}.note`, 'invalid');
  return { id: v.id, title: v.title, start: v.start, end: v.end as ISODate | null, ink: v.ink, note: v.note };
}

/** Parse untrusted data (local storage or an imported file) into a well-formed archive. Throws ArchiveError. */
export function readArchive(raw: unknown): AppData {
  if (!isObj(raw)) fail('archive', 'not an ETERNALL archive');
  if (raw.version !== DATA_VERSION) fail('version', `unsupported version ${String(raw.version)}`);
  const settings = isObj(raw.settings) ? raw.settings : {};
  return {
    version: DATA_VERSION,
    profile: readProfile(raw.profile ?? null),
    inscriptions: readList(raw.inscriptions ?? [], 'inscriptions', readInscription),
    capsules: readList(raw.capsules ?? [], 'capsules', readCapsule),
    chapters: readList(raw.chapters ?? [], 'chapters', readChapter),
    settings: {
      theme: isTheme(settings.theme) ? settings.theme : 'system',
      lens: isLens(settings.lens) ? settings.lens : 'moments',
    },
  };
}

