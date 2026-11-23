import type { ComponentType } from 'react';
import type { ISODate, Tone } from './tones';

/**
 * The contract between the ETERNALL house and its imprints (docs/ARCHITECTURE.md §3).
 * The house knows imprints only through `ImprintDefinition`; imprints never import each other.
 */

export type ImprintId = 'amazeen' | 'refrain' | 'kindred' | 'marginalia';
/** Where a contribution comes from: one of the apps, or the house itself (chapters, almanac, inscriptions). */
export type SourceId = ImprintId | 'house';

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
  imprint: SourceId;
  text: string;
  href: string;
  tone?: Tone;
  emphasis?: 'ready';
}

/** Something remembered on a date, used for echoes and search across imprints. */
export interface Memory {
  imprint: SourceId;
  id: string;
  date: ISODate;
  title: string;
  excerpt?: string;
  tone?: Tone;
  href: string;
}

export interface AlmanacFact {
  imprint: SourceId;
  label: string;
  value: string;
  note?: string;
}

export interface RedLetterDay {
  imprint: SourceId;
  date: ISODate;
  label: string;
  href: string;
}

/**
 * A gentle local reminder, opted into inside its imprint (docs/FLOWS.md, local reminders).
 * Delivered by the house once per `key`, only while the app is open; nothing comes from a server.
 */
export interface Reminder {
  imprint: SourceId;
  /** Stable and unique per occasion, e.g. "kindred_<person>_birthday_2026-12-01_0". */
  key: string;
  /** The day it is for; reminders older than a week are never delivered late. */
  date: ISODate;
  title: string;
  body: string;
  href: string;
}

export interface ImprintAppProps {
  /** Path inside the imprint, always starting with "/" (e.g. "/letter/abc"). */
  path: string;
  search: URLSearchParams;
}

/** What a contributor (an app, or a house section) may add to the shared views. All optional. */
export interface Contributions {
  lifeline?(ctx: ContributionContext): LifelineLayer;
  weekLines?(ctx: ContributionContext, start: ISODate, end: ISODate): WeekLine[];
  memories?(ctx: ReadContext): Memory[];
  almanacFacts?(ctx: ReadContext): AlmanacFact[];
  redLetterDays?(ctx: ReadContext): RedLetterDay[];
  /** A short status for the doors menu, e.g. "1 ready". */
  badge?(ctx: ReadContext): string | null;
  /** Local reminders due today (empty unless the person opted in). */
  reminders?(ctx: ReadContext): Reminder[];
  /** Cross-imprint capabilities this imprint offers (typed in @eternall/kit). */
  provides?(ctx: ProvideContext): Record<string, unknown>;
}

export interface ImprintDefinition extends Contributions {
  id: ImprintId;
  /** Wordmark, e.g. "KINDRED". */
  name: string;
  /** Plain function line, always shown beside the name (docs/BRAND.md §4). */
  functionLine: string;
  basePath: `/${string}/`;
  release: 1 | 2;
  accent: { light: string; dark: string };
  /** One-time first-contact hint explaining the metaphor (docs/DESIGN.md §1.3). */
  intro: string;
  /**
   * The app's own identity outside its pages (docs/adr/0011): tab and install icon, browser
   * chrome colour, the heading of its unlock card, and the label of its small exit to the house.
   */
  brand: {
    icon: string;
    themeColor: { light: string; dark: string };
    lockTitle: string;
    leaveLabel: string;
  };
  /** Lazy UI chunk: loaded only when the door opens. */
  load(): Promise<{ default: ComponentType<ImprintAppProps> }>;
  /** Collections owned by this imprint (for erase and storage accounting). */
  collections: readonly string[];
  /** Whether this imprint holds any of the person's records. */
  hasData(ctx: ReadContext): boolean;
}

/**
 * A part of the house that keeps its own records and contributes like an app does, but has no
 * door of its own (Chapters and Almanac live on house pages: docs/adr/0011).
 */
export interface HouseSection extends Contributions {
  id: 'chapters' | 'almanac';
  name: string;
  functionLine: string;
  /** The house page, e.g. "/chapters". */
  href: string;
  accent: { light: string; dark: string };
  collections: readonly string[];
  hasData(ctx: ReadContext): boolean;
}

/** Anything that contributes to the lifeline, week panel, search and almanac. */
export type Contributor = ImprintDefinition | HouseSection;

export interface ProvideContext extends ReadContext {
  navigate(href: string): void;
}
