import { weekKey } from './dates';
import { entryText } from './text';
import type { Entry, Section } from './types';

export interface SearchHit {
  entry: Entry;
  issueKey: string;
  /** A window of text around the first match. */
  snippet: string;
}

const SNIPPET_RADIUS = 60;

export function snippetAround(text: string, query: string): string {
  const flat = text.replace(/\s+/gu, ' ').trim();
  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return flat.slice(0, SNIPPET_RADIUS * 2) + (flat.length > SNIPPET_RADIUS * 2 ? '…' : '');
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(flat.length, at + query.length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

/** Case-insensitive full-text search across entries; all whitespace-separated terms must match. Newest first. */
export function searchEntries(entries: readonly Entry[], query: string, section: Section | null = null, limit = 50): SearchHit[] {
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/u).filter(Boolean);
  if (terms.length === 0 && section === null) return [];
  const hits: SearchHit[] = [];
  const sorted = entries.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const entry of sorted) {
    if (section && entry.section !== section) continue;
    const text = entryText(entry);
    const lower = text.toLowerCase();
    if (!terms.every((t) => lower.includes(t))) continue;
    hits.push({ entry, issueKey: weekKey(new Date(entry.createdAt)), snippet: snippetAround(text, terms[0] ?? '') });
    if (hits.length >= limit) break;
  }
  return hits;
}
