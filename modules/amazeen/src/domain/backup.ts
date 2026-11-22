import type { AppData, Entry } from './types';

const DAY_MS = 86_400_000;
export const BACKUP_INTERVAL_DAYS = 14;
export const REMINDER_SNOOZE_DAYS = 7;

function newestChange(entries: readonly Entry[]): string | null {
  return entries.reduce<string | null>((max, e) => (max === null || e.updatedAt > max ? e.updatedAt : max), null);
}

function oldestEntry(entries: readonly Entry[]): string | null {
  return entries.reduce<string | null>((min, e) => (min === null || e.createdAt < min ? e.createdAt : min), null);
}

export interface BackupStatus {
  /** Show the reminder now. */
  due: boolean;
  /** Days since the last export, or null if never exported. */
  daysSinceExport: number | null;
}

/**
 * A backup is due when there are changes the last export doesn't contain, and either it's been
 * BACKUP_INTERVAL_DAYS since that export or (never exported) the archive is that old.
 * A dismissed reminder stays quiet for REMINDER_SNOOZE_DAYS.
 */
export function backupStatus(data: AppData, now: Date, snoozedAt: string | null): BackupStatus {
  const last = data.lastExportedAt ?? null;
  const daysSinceExport = last ? Math.floor((now.getTime() - Date.parse(last)) / DAY_MS) : null;
  const changed = newestChange(data.entries);
  if (!changed || (last && changed <= last)) return { due: false, daysSinceExport };
  if (snoozedAt && now.getTime() - Date.parse(snoozedAt) < REMINDER_SNOOZE_DAYS * DAY_MS) return { due: false, daysSinceExport };
  const reference = last ?? oldestEntry(data.entries);
  const age = reference ? (now.getTime() - Date.parse(reference)) / DAY_MS : 0;
  return { due: age >= BACKUP_INTERVAL_DAYS, daysSinceExport };
}

export interface ArchiveSummary {
  entries: number;
  issues: number;
  first: string | null;
  last: string | null;
}

export function summarize(data: AppData, weekOf: (iso: string) => string): ArchiveSummary {
  const weeks = new Set(data.entries.map((e) => weekOf(e.createdAt)));
  const sorted = data.entries.map((e) => e.createdAt).toSorted();
  return { entries: data.entries.length, issues: weeks.size, first: sorted[0] ?? null, last: sorted.at(-1) ?? null };
}

/** When the masthead/cover settings last changed. Archives from before this was tracked fall back to the masthead's creation time. */
export function metaStamp(data: Pick<AppData, 'metaUpdatedAt' | 'magazine'>): string {
  return data.metaUpdatedAt ?? data.magazine?.createdAt ?? '';
}

export interface MergeResult {
  data: AppData;
  /** Entries that came from `incoming` and did not exist here. */
  added: number;
  /** Entries replaced by a newer edit from `incoming`. */
  updated: number;
  /** Entries removed because `incoming` deleted them after their last edit here. */
  removed: number;
}

export interface MergeOptions {
  /**
   * How to treat the masthead and cover overrides.
   * - `keep-current` (imports): keep my masthead; overrides from the file win per issue.
   * - `newest` (sync): whichever side changed them last wins, as a unit.
   */
  meta?: 'keep-current' | 'newest';
}

/**
 * Merge two archives. This is the one place that decides what survives, for both file imports and
 * device sync, so the rules are the same everywhere:
 *
 * - Entries match by id. For each id the newest of {entry edit, deletion} wins; on an exact tie the
 *   entry wins (we'd rather keep a piece than lose it).
 * - A deletion is remembered as a tombstone, so it can't be undone by a device that missed it.
 * - The result never has both a live entry and a tombstone for the same id.
 */
export function mergeData(current: AppData, incoming: AppData, options: MergeOptions = {}): MergeResult {
  const live = new Map<string, Entry>();
  const dead = new Map<string, string>();
  for (const e of current.entries) live.set(e.id, e);
  for (const [id, at] of Object.entries(current.tombstones)) dead.set(id, at);

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [id, at] of Object.entries(incoming.tombstones)) {
    const entry = live.get(id);
    if (entry) {
      if (at > entry.updatedAt) {
        live.delete(id);
        dead.set(id, at);
        removed += 1;
      }
    } else if (!dead.has(id) || at > (dead.get(id) ?? '')) {
      dead.set(id, at);
    }
  }

  for (const entry of incoming.entries) {
    const deletedAt = dead.get(entry.id);
    if (deletedAt !== undefined && deletedAt > entry.updatedAt) continue; // deleted after this edit
    const existing = live.get(entry.id);
    if (!existing) {
      live.set(entry.id, entry);
      dead.delete(entry.id);
      added += 1;
    } else if (entry.updatedAt > existing.updatedAt) {
      live.set(entry.id, entry);
      updated += 1;
    }
  }
  for (const id of live.keys()) dead.delete(id); // a live entry supersedes any older tombstone

  const newest = options.meta === 'newest';
  const takeIncomingMeta = newest && metaStamp(incoming) > metaStamp(current);
  const metaUpdatedAt = takeIncomingMeta ? metaStamp(incoming) || undefined : current.metaUpdatedAt;
  return {
    data: {
      ...current,
      magazine: takeIncomingMeta ? (incoming.magazine ?? current.magazine) : (current.magazine ?? incoming.magazine),
      entries: [...live.values()],
      tombstones: Object.fromEntries(dead),
      overrides: takeIncomingMeta ? incoming.overrides : newest ? current.overrides : { ...current.overrides, ...incoming.overrides },
      ...(metaUpdatedAt ? { metaUpdatedAt } : {}),
    },
    added,
    updated,
    removed,
  };
}
