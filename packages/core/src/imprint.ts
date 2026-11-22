import type { ComponentType } from 'react';
import type { ISODate, Tone } from './tones';

/**
 * The contract between the ETERNALL house and its imprints (docs/ARCHITECTURE.md §3).
 * The house knows imprints only through `ImprintDefinition`; imprints never import each other.
 */

export type ImprintId = 'amazeen' | 'envoi' | 'folio' | 'almanack' | 'refrain' | 'prologue' | 'kindred' | 'marginalia';

export interface HouseProfile {
  id: 'me';
  name: string;
  birthDate: ISODate;
  /** How many years the lifeline spans. */
  horizonYears: number;
  hemisphere: 'north' | 'south';
  createdAt: string;
}

/** Read-only view of the vault, enough for contributions. */
export interface CollectionReader<T> {
  all(): readonly T[];
  get(id: string): T | undefined;
}
export interface DataReader {
  collection<T extends { id: string }>(path: string): CollectionReader<T>;
}

export interface ReadContext {
  data: DataReader;
  today: ISODate;
  profile: HouseProfile | null;
}

export interface ContributionContext extends ReadContext {
  /** Lifeline week index for a date, or null without a profile / outside the horizon. */
  weekIndexOf(date: ISODate): number | null;
}

export type LifelineMarker = 'letter-sealed' | 'letter-ready' | 'letter-opened' | 'chapter-start' | 'ritual' | 'person' | 'work' | 'season';

/** Signals an imprint paints onto the lifeline, keyed by week index. Signals, never content. */
export interface LifelineLayer {
  tones?: ReadonlyMap<number, Tone>;
  bands?: ReadonlyMap<number, { color: string; label: string }>;
  markers?: ReadonlyMap<number, LifelineMarker>;
}

/** One line in the house week panel. */
export interface WeekLine {
  imprint: ImprintId;
  text: string;
  href: string;
  tone?: Tone;
  emphasis?: 'ready';
}

/** Something remembered on a date, used for echoes and search across imprints. */
export interface Memory {
  imprint: ImprintId | 'house';
  id: string;
  date: ISODate;
  title: string;
  excerpt?: string;
  tone?: Tone;
  href: string;
}

export interface AlmanacFact {
  imprint: ImprintId;
  label: string;
  value: string;
  note?: string;
}

export interface RedLetterDay {
  imprint: ImprintId;
  date: ISODate;
  label: string;
  href: string;
}

export interface ImprintAppProps {
  /** Path inside the imprint, always starting with "/" (e.g. "/letter/abc"). */
  path: string;
  search: URLSearchParams;
}

export interface ImprintDefinition {
  id: ImprintId;
  /** Wordmark, e.g. "ENVOI". */
  name: string;
  /** Plain function line, always shown beside the name (docs/BRAND.md §4). */
  functionLine: string;
  basePath: `/${string}/`;
  release: 1 | 2;
  accent: { light: string; dark: string };
  /** One-time first-contact hint explaining the metaphor (docs/DESIGN.md §1.3). */
  intro: string;
  /** Lazy UI chunk: loaded only when the door opens. */
  load(): Promise<{ default: ComponentType<ImprintAppProps> }>;
  /** Collections owned by this imprint (for erase and storage accounting). */
  collections: readonly string[];
  /** Whether this imprint holds any of the person's records. */
  hasData(ctx: ReadContext): boolean;
  lifeline?(ctx: ContributionContext): LifelineLayer;
  weekLines?(ctx: ContributionContext, start: ISODate, end: ISODate): WeekLine[];
  memories?(ctx: ReadContext): Memory[];
  almanacFacts?(ctx: ReadContext): AlmanacFact[];
  redLetterDays?(ctx: ReadContext): RedLetterDay[];
  /** A short status for the doors menu, e.g. "1 ready". */
  badge?(ctx: ReadContext): string | null;
  /** Cross-imprint capabilities this imprint offers (typed in @eternall/kit). */
  provides?(ctx: ProvideContext): Record<string, unknown>;
}

export interface ProvideContext extends ReadContext {
  navigate(href: string): void;
}
