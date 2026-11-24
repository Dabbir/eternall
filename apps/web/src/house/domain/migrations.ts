import type { ISODate } from '@eternall/core';
import { INSCRIPTION_PATH, LIMITS, type Inscription } from './house';

/**
 * PROLOGUE was retired (docs/adr/0011). Its seasons live on as house inscriptions, written once per
 * season, including seasons that arrive later through sync. The original `prologue/*` records are
 * left untouched in the vault and in exports, so nothing is ever lost.
 */
export const PROLOGUE_SEASON_PATH = 'prologue/season';
export const PROLOGUE_HOPE_PATH = 'prologue/hope';
export const MIGRATIONS_PATH = 'house/migrations';

export interface RetiredSeason {
  id: string;
  name: string;
  theme: string;
  start: ISODate;
  end: ISODate;
  closedAt: string | null;
  epilogue: string;
}
export interface RetiredHope {
  id: string;
  seasonId: string;
  title: string;
  state: string;
  reflection: string;
  act: number;
}
export interface MigrationLog {
  id: 'prologue';
  seasons: string[];
}

const STATE: Record<string, string> = { wings: 'in the wings', stage: 'on stage', bow: 'took a bow', rewritten: 'rewritten', letGo: 'let go' };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const inscriptionIdFor = (seasonId: string) => `prologue_${seasonId}`.slice(0, 64);

/** One season, its acts and its epilogue, as a house inscription. */
export function seasonInscription(season: RetiredSeason, hopes: readonly RetiredHope[], today: ISODate, now: string): Inscription {
  const title = (season.theme ? `${season.name}: the season of ${season.theme}` : season.name).slice(0, LIMITS.title);
  const acts = hopes
    .filter((h) => h.seasonId === season.id)
    .sort((a, b) => a.act - b.act)
    .map((h) => `Act ${ROMAN[h.act - 1] ?? h.act}. ${h.title} (${STATE[h.state] ?? h.state})${h.reflection ? `\n${h.reflection}` : ''}`);
  const body = [
    `Hopes for ${season.name}, ${season.start} to ${season.end}.`,
    ...(acts.length ? acts : ['No acts were written for this season.']),
    ...(season.epilogue ? [`Epilogue\n${season.epilogue}`] : []),
  ]
    .join('\n\n')
    .slice(0, LIMITS.inscriptionBody);
  return { id: inscriptionIdFor(season.id), date: season.start < today ? season.start : today, title, body, tone: 'wonder', createdAt: now, updatedAt: now };
}

/** Seasons that still need their inscription. */
export function seasonsToMigrate(seasons: readonly RetiredSeason[], log: MigrationLog | undefined): RetiredSeason[] {
  const done = new Set(log?.seasons);
  return seasons.filter((s) => !done.has(s.id));
}

interface Col<T> {
  all(): readonly T[];
  get(id: string): T | undefined;
  put(item: T): void;
}
interface Writable {
  collection<T extends { id: string }>(path: string): Col<T>;
}

/** Idempotent: safe on every vault change. Returns how many seasons were moved. */
export function migratePrologue(vault: Writable, today: ISODate, now = new Date().toISOString()): number {
  const seasons = vault.collection<RetiredSeason>(PROLOGUE_SEASON_PATH).all();
  if (!seasons.length) return 0;
  const logCol = vault.collection<MigrationLog>(MIGRATIONS_PATH);
  const todo = seasonsToMigrate(seasons, logCol.get('prologue'));
  if (!todo.length) return 0;
  const hopes = vault.collection<RetiredHope>(PROLOGUE_HOPE_PATH).all();
  const inscriptions = vault.collection<Inscription>(INSCRIPTION_PATH);
  for (const s of todo) if (!inscriptions.get(inscriptionIdFor(s.id))) inscriptions.put(seasonInscription(s, hopes, today, now));
  logCol.put({ id: 'prologue', seasons: [...(logCol.get('prologue')?.seasons ?? []), ...todo.map((s) => s.id)] });
  return todo.length;
}

/**
 * MARGINALIA was retired (docs/adr/0014). Every underline becomes an AMAZEEN quote, and every finished
 * work that had no underlines becomes one short note, written once each (including ones that arrive
 * later through sync). The original `marginalia/*` records stay in the vault and in exports.
 */
export const MARGINALIA_WORK_PATH = 'marginalia/work';
export const MARGINALIA_UNDERLINE_PATH = 'marginalia/underline';
export const AMAZEEN_ENTRY_PATH = 'amazeen/entry';

export interface RetiredWork {
  id: string;
  title: string;
  by: string;
  finished: ISODate | null;
  landing: { stars: number } | { word: string } | null;
  createdAt: string;
}
export interface RetiredUnderline {
  id: string;
  workId: string;
  text: string;
  locator: string;
  note: string;
  createdAt: string;
}
/** The fields of an AMAZEEN entry this migration writes (modules/amazeen/src/domain/types.ts). */
export interface JournalEntry {
  id: string;
  kind: 'quote' | 'note';
  body: string;
  attribution?: string;
  section: 'culture';
  mood: 3;
  starred: false;
  createdAt: string;
  updatedAt: string;
}
export interface MarginaliaLog {
  id: 'marginalia';
  underlines: string[];
  works: string[];
}

const ATTRIBUTION_MAX = 80;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** "By, Title, p. 42" — who said it and where, as AMAZEEN's quote attribution. */
export function attributionFor(work: Pick<RetiredWork, 'title' | 'by'> | undefined, locator: string): string {
  const parts = [work?.by?.trim(), work?.title?.trim(), locator.trim()].filter(Boolean) as string[];
  return clip(parts.join(', ') || 'Unknown', ATTRIBUTION_MAX);
}

/** One underline as a journal quote: the passage, then the margin note as a second paragraph. */
export function underlineQuote(u: RetiredUnderline, work: RetiredWork | undefined): JournalEntry {
  const body = u.note.trim() ? `${u.text.trim()}\n\n${u.note.trim()}` : u.text.trim();
  return { id: `mg_${u.id}`.slice(0, 64), kind: 'quote', body, attribution: attributionFor(work, u.locator), section: 'culture', mood: 3, starred: false, createdAt: u.createdAt, updatedAt: u.createdAt };
}

/** A finished work with no underlines, as one note on the day it was finished. */
export function finishedNote(w: RetiredWork): JournalEntry {
  const landing = !w.landing ? '' : 'stars' in w.landing ? ` ${'★'.repeat(w.landing.stars)}${'☆'.repeat(Math.max(0, 5 - w.landing.stars))}` : ` In a word: ${w.landing.word}.`;
  const at = `${w.finished}T12:00:00.000Z`;
  return { id: `mg_${w.id}`.slice(0, 64), kind: 'note', body: `Finished “${w.title}”${w.by ? ` by ${w.by}` : ''}.${landing}`, section: 'culture', mood: 3, starred: false, createdAt: at, updatedAt: at };
}

/** Idempotent: safe on every vault change. Returns how many journal entries were written. */
export function migrateMarginalia(vault: Writable): number {
  const underlines = vault.collection<RetiredUnderline>(MARGINALIA_UNDERLINE_PATH).all();
  const works = vault.collection<RetiredWork>(MARGINALIA_WORK_PATH).all();
  if (!underlines.length && !works.length) return 0;
  const logCol = vault.collection<MarginaliaLog>(MIGRATIONS_PATH);
  const log = logCol.get('marginalia') ?? { id: 'marginalia', underlines: [], works: [] };
  const doneU = new Set(log.underlines);
  const doneW = new Set(log.works);
  const byId = new Map(works.map((w) => [w.id, w]));
  const underlined = new Set(underlines.map((u) => u.workId));
  const entries = vault.collection<JournalEntry>(AMAZEEN_ENTRY_PATH);
  let written = 0;
  const newU: string[] = [];
  const newW: string[] = [];
  for (const u of underlines) {
    if (doneU.has(u.id)) continue;
    const e = underlineQuote(u, byId.get(u.workId));
    if (!entries.get(e.id)) {
      entries.put(e);
      written++;
    }
    newU.push(u.id);
  }
  for (const w of works) {
    if (doneW.has(w.id) || !w.finished || underlined.has(w.id)) continue;
    const e = finishedNote(w);
    if (!entries.get(e.id)) {
      entries.put(e);
      written++;
    }
    newW.push(w.id);
  }
  if (newU.length || newW.length) logCol.put({ id: 'marginalia', underlines: [...log.underlines, ...newU], works: [...log.works, ...newW] });
  return written;
}
