import { ENTRY_KINDS, INKS, MOODS, SECTIONS } from './types';
import type { Entry, EntryDraft, EntryKind, EntryMeta, Ink, Mood, Section } from './types';

export const LIMITS = {
  title: 120,
  body: 20_000,
  attribution: 80,
  listItem: 140,
  listItems: 12,
  headline: 90,
  magazineTitle: 32,
  editor: 48,
} as const;

export type DraftErrors = Partial<Record<'title' | 'body' | 'attribution' | 'items', string>>;

export function isSection(value: unknown): value is Section {
  return typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);
}
export function isKind(value: unknown): value is EntryKind {
  return typeof value === 'string' && (ENTRY_KINDS as readonly string[]).includes(value);
}
export function isMood(value: unknown): value is Mood {
  return typeof value === 'number' && (MOODS as readonly number[]).includes(value);
}
export function isInk(value: unknown): value is Ink {
  return typeof value === 'string' && (INKS as readonly string[]).includes(value);
}

export function emptyDraft(kind: EntryKind): EntryDraft {
  switch (kind) {
    case 'story':
      return { kind, title: '', body: '' };
    case 'note':
      return { kind, body: '' };
    case 'quote':
      return { kind, body: '', attribution: '' };
    case 'list':
      return { kind, title: '', items: ['', '', ''] };
  }
}

export function draftFromEntry(entry: Entry): EntryDraft {
  switch (entry.kind) {
    case 'story':
      return { kind: 'story', title: entry.title, body: entry.body };
    case 'note':
      return { kind: 'note', body: entry.body };
    case 'quote':
      return { kind: 'quote', body: entry.body, attribution: entry.attribution };
    case 'list':
      return { kind: 'list', title: entry.title, items: [...entry.items] };
  }
}

/** Normalise whitespace while preserving paragraph breaks. */
function cleanBody(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function cleanLine(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

export function normalizeDraft(draft: EntryDraft): EntryDraft {
  switch (draft.kind) {
    case 'story':
      return { kind: 'story', title: cleanLine(draft.title), body: cleanBody(draft.body) };
    case 'note':
      return { kind: 'note', body: cleanBody(draft.body) };
    case 'quote':
      return { kind: 'quote', body: cleanLine(draft.body).replace(/^["“]|["”]$/gu, ''), attribution: cleanLine(draft.attribution) };
    case 'list':
      return { kind: 'list', title: cleanLine(draft.title), items: draft.items.map(cleanLine).filter(Boolean) };
  }
}

/** Validate a (normalised) draft. Returns an empty object when valid. */
export function validateDraft(input: EntryDraft): DraftErrors {
  const draft = normalizeDraft(input);
  const errors: DraftErrors = {};
  const requireTitle = (title: string, what: string): void => {
    if (!title) errors.title = `Every ${what} needs a headline.`;
    else if (title.length > LIMITS.title) errors.title = `Keep the headline under ${LIMITS.title} characters.`;
  };
  const requireBody = (body: string, empty: string, max: number = LIMITS.body): void => {
    if (!body) errors.body = empty;
    else if (body.length > max) errors.body = `That's ${body.length.toLocaleString()} characters; the limit is ${max.toLocaleString()}.`;
  };

  switch (draft.kind) {
    case 'story':
      requireTitle(draft.title, 'story');
      requireBody(draft.body, 'A story needs at least a few words of copy.');
      break;
    case 'note':
      requireBody(draft.body, 'Write a line or two before filing.', 1_000);
      break;
    case 'quote':
      requireBody(draft.body, 'What was said?', 400);
      if (draft.attribution.length > LIMITS.attribution) errors.attribution = `Keep it under ${LIMITS.attribution} characters.`;
      break;
    case 'list':
      requireTitle(draft.title, 'list');
      if (draft.items.length === 0) errors.items = 'Add at least one item.';
      else if (draft.items.length > LIMITS.listItems) errors.items = `Lists top out at ${LIMITS.listItems} items.`;
      else if (draft.items.some((i) => i.length > LIMITS.listItem)) errors.items = `Keep each item under ${LIMITS.listItem} characters.`;
      break;
  }
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** True when the draft has nothing worth keeping (used to skip "unsaved changes" prompts). */
export function isDraftBlank(draft: EntryDraft): boolean {
  const n = normalizeDraft(draft);
  switch (n.kind) {
    case 'story':
      return !n.title && !n.body;
    case 'note':
      return !n.body;
    case 'quote':
      return !n.body && !n.attribution;
    case 'list':
      return !n.title && n.items.length === 0;
  }
}

export function sameDraft(a: EntryDraft, b: EntryDraft): boolean {
  return JSON.stringify(normalizeDraft(a)) === JSON.stringify(normalizeDraft(b));
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Build a new entry from a validated draft. Throws if the draft is invalid. */
export function createEntry(draft: EntryDraft, meta: EntryMeta, now: Date = new Date(), id: string = createId()): Entry {
  if (hasErrors(validateDraft(draft))) throw new Error('Cannot create an entry from an invalid draft.');
  const ts = now.toISOString();
  return { ...normalizeDraft(draft), ...meta, id, createdAt: ts, updatedAt: ts } as Entry;
}

/** Apply edits to an entry, keeping its identity and filing date. */
export function updateEntry(entry: Entry, draft: EntryDraft, meta: EntryMeta, now: Date = new Date()): Entry {
  if (hasErrors(validateDraft(draft))) throw new Error('Cannot update an entry with an invalid draft.');
  return { ...normalizeDraft(draft), ...meta, id: entry.id, createdAt: entry.createdAt, updatedAt: now.toISOString() } as Entry;
}

/** Strictly parse an unknown value into an Entry, or null if anything is off. Used for imports and storage. */
export function parseEntry(value: unknown): Entry | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const str = (key: string): string | null => (typeof v[key] === 'string' ? (v[key] as string) : null);
  const id = str('id');
  const createdAt = str('createdAt');
  const updatedAt = str('updatedAt') ?? createdAt;
  if (!id || id.length > 64 || !createdAt || !updatedAt) return null;
  if (Number.isNaN(Date.parse(createdAt)) || Number.isNaN(Date.parse(updatedAt))) return null;
  if (!isKind(v.kind) || !isSection(v.section) || !isMood(v.mood)) return null;

  let draft: EntryDraft;
  switch (v.kind) {
    case 'story':
      draft = { kind: 'story', title: str('title') ?? '', body: str('body') ?? '' };
      break;
    case 'note':
      draft = { kind: 'note', body: str('body') ?? '' };
      break;
    case 'quote':
      draft = { kind: 'quote', body: str('body') ?? '', attribution: str('attribution') ?? '' };
      break;
    case 'list': {
      const items = Array.isArray(v.items) ? v.items.filter((i): i is string => typeof i === 'string') : [];
      draft = { kind: 'list', title: str('title') ?? '', items };
      break;
    }
  }
  if (hasErrors(validateDraft(draft))) return null;
  return {
    ...normalizeDraft(draft),
    id,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    section: v.section,
    mood: v.mood,
    starred: v.starred === true,
  } as Entry;
}
