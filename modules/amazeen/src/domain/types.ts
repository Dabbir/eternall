/**
 * Core domain model for AMAZEEN.
 *
 * A person files *entries* throughout the week. Every ISO week with at least one
 * entry is compiled into an *issue* — a magazine laid out from those entries.
 */

export const SECTIONS = ['life', 'work', 'ideas', 'culture', 'body', 'people', 'elsewhere'] as const;
export type Section = (typeof SECTIONS)[number];

export const ENTRY_KINDS = ['story', 'note', 'quote', 'list'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** 1 = storm … 5 = sunny. Rendered as the issue's "weather report". */
export const MOODS = [1, 2, 3, 4, 5] as const;
export type Mood = (typeof MOODS)[number];

/** Riso-style printing inks used for covers. */
export const INKS = ['blue', 'teal', 'violet', 'orange', 'yellow', 'pink', 'green'] as const;
export type Ink = (typeof INKS)[number];

interface EntryBase {
  readonly id: string;
  /** ISO timestamp. Determines which issue the entry belongs to. */
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly section: Section;
  readonly mood: Mood;
  /** A starred story is promoted to cover story. */
  readonly starred: boolean;
}

export interface StoryEntry extends EntryBase {
  readonly kind: 'story';
  readonly title: string;
  readonly body: string;
}

export interface NoteEntry extends EntryBase {
  readonly kind: 'note';
  readonly body: string;
}

export interface QuoteEntry extends EntryBase {
  readonly kind: 'quote';
  readonly body: string;
  readonly attribution: string;
}

export interface ListEntry extends EntryBase {
  readonly kind: 'list';
  readonly title: string;
  readonly items: readonly string[];
}

export type Entry = StoryEntry | NoteEntry | QuoteEntry | ListEntry;

/** Shape of the editable content of an entry, independent of identity/timestamps. */
export type EntryDraft =
  | { kind: 'story'; title: string; body: string }
  | { kind: 'note'; body: string }
  | { kind: 'quote'; body: string; attribution: string }
  | { kind: 'list'; title: string; items: string[] };

export interface EntryMeta {
  section: Section;
  mood: Mood;
  starred: boolean;
}

export interface Magazine {
  /** Masthead printed on every cover. */
  readonly title: string;
  /** Byline used on features. */
  readonly editor: string;
  readonly createdAt: string;
}

export interface IssueOverride {
  readonly ink?: Ink;
  readonly headline?: string;
}

export interface AppData {
  readonly version: 2;
  readonly magazine: Magazine | null;
  readonly entries: readonly Entry[];
  /**
   * Entries that were deleted, id → deletion time (ISO). Needed so a deletion made on one device
   * is not undone by another device that still has the entry when they sync.
   */
  readonly tombstones: Readonly<Record<string, string>>;
  /** Per-issue cover customisation, keyed by week key (e.g. `2026-W47`). */
  readonly overrides: Readonly<Record<string, IssueOverride>>;
  /** When the masthead or any cover override last changed (newest wins when syncing). */
  readonly metaUpdatedAt?: string;
  /** When the archive was last exported (drives the backup reminder). */
  readonly lastExportedAt?: string;
}

export type IssueStatus = 'in-production' | 'published';

export interface IssueStats {
  readonly entries: number;
  readonly words: number;
  readonly readingMinutes: number;
  /** Average mood rounded to nearest whole mood, or null without entries. */
  readonly mood: Mood | null;
  /** Average mood per weekday Mon..Sun; null where nothing was filed. */
  readonly moodByDay: readonly (number | null)[];
  readonly daysWritten: number;
  readonly sections: readonly { section: Section; count: number }[];
}

export interface PressCheckItem {
  readonly id: 'cover' | 'volume' | 'voices' | 'rhythm';
  readonly label: string;
  readonly hint: string;
  readonly done: boolean;
}

export interface Issue {
  readonly key: string;
  readonly number: number;
  readonly volume: number;
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly status: IssueStatus;
  readonly entries: readonly Entry[];
  readonly coverStory: Entry | null;
  readonly headline: string;
  readonly coverLines: readonly string[];
  readonly ink: Ink;
  readonly stats: IssueStats;
}
