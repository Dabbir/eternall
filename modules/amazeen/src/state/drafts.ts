import { isMood, isSection } from '../domain/entries';
import { DRAFT_KEY, readRaw, removeRaw, safeStorage, writeRaw } from '../domain/storage';
import type { EntryDraft, EntryKind, EntryMeta } from '../domain/types';

/** Unfinished drafts are kept per kind so switching between Story and Note never loses work. */
export interface SavedDraft {
  draft: EntryDraft;
  meta: EntryMeta;
  savedAt: string;
}

type DraftMap = Partial<Record<EntryKind, SavedDraft>>;

function readAll(): DraftMap {
  const raw = readRaw(safeStorage(), DRAFT_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as DraftMap) : {};
  } catch {
    return {};
  }
}

function isValidSaved(kind: EntryKind, value: SavedDraft | undefined): value is SavedDraft {
  if (!value || typeof value !== 'object') return false;
  const { draft, meta } = value;
  if (!draft || draft.kind !== kind || !meta || !isSection(meta.section) || !isMood(meta.mood)) return false;
  switch (draft.kind) {
    case 'story':
      return typeof draft.title === 'string' && typeof draft.body === 'string';
    case 'note':
      return typeof draft.body === 'string';
    case 'quote':
      return typeof draft.body === 'string' && typeof draft.attribution === 'string';
    case 'list':
      return typeof draft.title === 'string' && Array.isArray(draft.items) && draft.items.every((i) => typeof i === 'string');
  }
}

export function loadDraft(kind: EntryKind): SavedDraft | null {
  const value = readAll()[kind];
  return isValidSaved(kind, value) ? { ...value, meta: { ...value.meta, starred: value.meta.starred === true } } : null;
}

export function saveDraft(kind: EntryKind, saved: SavedDraft): boolean {
  return writeRaw(safeStorage(), DRAFT_KEY, JSON.stringify({ ...readAll(), [kind]: saved })).ok;
}

export function clearDraft(kind: EntryKind): void {
  const { [kind]: _removed, ...rest } = readAll();
  if (Object.keys(rest).length === 0) removeRaw(safeStorage(), DRAFT_KEY);
  else writeRaw(safeStorage(), DRAFT_KEY, JSON.stringify(rest));
}

/** Remove every unfinished draft (used when erasing the archive). */
export function clearAllDrafts(): void {
  removeRaw(safeStorage(), DRAFT_KEY);
}
