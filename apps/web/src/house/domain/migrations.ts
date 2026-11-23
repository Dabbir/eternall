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
