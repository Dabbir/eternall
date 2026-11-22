import { SECTION_INFO } from './catalog';
import { coverLineFor } from './issues';
import { entryWords, readingMinutes } from './text';
import type { Entry, EntryKind, Issue, ListEntry, NoteEntry, QuoteEntry, StoryEntry } from './types';

/** A single page (or spread) of a laid-out issue. */
export type Page =
  | { kind: 'cover' }
  | { kind: 'contents' }
  | { kind: 'feature'; entry: StoryEntry; isCoverStory: boolean }
  | { kind: 'dispatches'; notes: NoteEntry[]; lists: ListEntry[]; part: number; parts: number }
  | { kind: 'overheard'; quotes: QuoteEntry[]; part: number; parts: number }
  | { kind: 'numbers' }
  | { kind: 'back' };

export interface ContentsItem {
  page: number;
  department: string;
  title: string;
  meta: string;
  isCoverStory: boolean;
}

const DISPATCHES_PER_PAGE = 6;
const QUOTES_PER_PAGE = 4;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Lay an issue out into pages. Empty issues are just a cover and a back page. */
export function layoutIssue(issue: Issue): Page[] {
  if (issue.entries.length === 0) return [{ kind: 'cover' }, { kind: 'back' }];

  const coverId = issue.coverStory?.id;
  const stories = issue.entries.filter((e): e is StoryEntry => e.kind === 'story').toSorted((a, b) => Number(b.id === coverId) - Number(a.id === coverId));
  const notes = issue.entries.filter((e): e is NoteEntry => e.kind === 'note');
  const lists = issue.entries.filter((e): e is ListEntry => e.kind === 'list');
  const quotes = issue.entries.filter((e): e is QuoteEntry => e.kind === 'quote');

  const pages: Page[] = [{ kind: 'cover' }, { kind: 'contents' }];
  for (const entry of stories) pages.push({ kind: 'feature', entry, isCoverStory: entry.id === coverId });

  // Lists count as two slots: they take more room on the page.
  const dispatchItems: (NoteEntry | ListEntry)[] = [...lists, ...notes];
  const dispatchPages: { notes: NoteEntry[]; lists: ListEntry[] }[] = [];
  let current = { notes: [] as NoteEntry[], lists: [] as ListEntry[] };
  let used = 0;
  for (const item of dispatchItems) {
    const cost = item.kind === 'list' ? 2 : 1;
    if (used + cost > DISPATCHES_PER_PAGE && used > 0) {
      dispatchPages.push(current);
      current = { notes: [], lists: [] };
      used = 0;
    }
    if (item.kind === 'list') current.lists.push(item);
    else current.notes.push(item);
    used += cost;
  }
  if (used > 0) dispatchPages.push(current);
  dispatchPages.forEach((p, i) => pages.push({ kind: 'dispatches', ...p, part: i + 1, parts: dispatchPages.length }));

  const quotePages = chunk(quotes, QUOTES_PER_PAGE);
  quotePages.forEach((q, i) => pages.push({ kind: 'overheard', quotes: q, part: i + 1, parts: quotePages.length }));

  pages.push({ kind: 'numbers' }, { kind: 'back' });
  return pages;
}

function describe(entry: Entry): string {
  const mins = readingMinutes(entryWords(entry));
  return entry.kind === 'story' ? `${mins} min read` : SECTION_INFO[entry.section].label;
}

/** Table of contents derived from the page layout. Page numbers are 1-based for display. */
export function contentsFor(issue: Issue, pages: readonly Page[]): ContentsItem[] {
  const items: ContentsItem[] = [];
  pages.forEach((page, index) => {
    const n = index + 1;
    switch (page.kind) {
      case 'feature':
        items.push({
          page: n,
          department: SECTION_INFO[page.entry.section].department,
          title: page.entry.title,
          meta: describe(page.entry),
          isCoverStory: page.isCoverStory,
        });
        break;
      case 'dispatches': {
        const first = page.lists[0] ?? page.notes[0];
        items.push({
          page: n,
          department: 'Dispatches',
          title: first ? coverLineFor(first) : 'Notes from the week',
          meta: `${page.notes.length + page.lists.length} short pieces${page.parts > 1 ? ` · part ${page.part}` : ''}`,
          isCoverStory: [...page.notes, ...page.lists].some((e) => e.id === issue.coverStory?.id),
        });
        break;
      }
      case 'overheard':
        items.push({
          page: n,
          department: 'Overheard',
          title: page.quotes[0] ? `“${page.quotes[0].body}”` : 'Things people said',
          meta: `${page.quotes.length} ${page.quotes.length === 1 ? 'quote' : 'quotes'}`,
          isCoverStory: page.quotes.some((q) => q.id === issue.coverStory?.id),
        });
        break;
      case 'numbers':
        items.push({ page: n, department: 'Data', title: 'The week, by the numbers', meta: 'Weather report & stats', isCoverStory: false });
        break;
      default:
        break;
    }
  });
  return items;
}

/** 1-based page number on which an entry appears, or 1 (the cover) if it isn't found. */
export function pageOf(pages: readonly Page[], entryId: string): number {
  const index = pages.findIndex((p) => {
    switch (p.kind) {
      case 'feature':
        return p.entry.id === entryId;
      case 'dispatches':
        return p.notes.some((e) => e.id === entryId) || p.lists.some((e) => e.id === entryId);
      case 'overheard':
        return p.quotes.some((e) => e.id === entryId);
      default:
        return false;
    }
  });
  return index < 0 ? 1 : index + 1;
}

/** A slot on the issue's flatplan: either a laid-out page or a planned page still awaiting copy. */
export type FlatplanSlot =
  | { status: 'set'; page: Page; number: number }
  | { status: 'planned'; kind: 'contents' | 'feature' | 'dispatches' | 'overheard' | 'numbers'; write: EntryKind | null };

/**
 * The issue as an editor's flatplan: every laid-out page in order, plus placeholders for the
 * sections a complete issue has (a feature, dispatches, an overheard page) that are still empty.
 */
export function flatplan(pages: readonly Page[]): FlatplanSlot[] {
  const set = pages.map((page, i): FlatplanSlot => ({ status: 'set', page, number: i + 1 }));
  const has = (kind: Page['kind']) => pages.some((p) => p.kind === kind);
  const planned = (kind: Extract<FlatplanSlot, { status: 'planned' }>['kind'], write: EntryKind | null): FlatplanSlot => ({ status: 'planned', kind, write });

  const cover = set.slice(0, 1);
  const back = set.slice(-1);
  const middle = set.slice(1, -1);
  const out: FlatplanSlot[] = [...cover];
  if (!has('contents')) out.push(planned('contents', null));
  out.push(...middle.filter((s) => s.status === 'set' && s.page.kind === 'contents'));
  const features = middle.filter((s) => s.status === 'set' && s.page.kind === 'feature');
  out.push(...(features.length ? features : [planned('feature', 'story')]));
  const dispatches = middle.filter((s) => s.status === 'set' && s.page.kind === 'dispatches');
  out.push(...(dispatches.length ? dispatches : [planned('dispatches', 'note')]));
  const overheard = middle.filter((s) => s.status === 'set' && s.page.kind === 'overheard');
  out.push(...(overheard.length ? overheard : [planned('overheard', 'quote')]));
  if (!has('numbers')) out.push(planned('numbers', null));
  out.push(...middle.filter((s) => s.status === 'set' && s.page.kind === 'numbers'));
  out.push(...back);
  return out;
}
