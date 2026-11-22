import type { Entry } from './types';

const WORDS_PER_MINUTE = 230;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

export function entryText(entry: Entry): string {
  switch (entry.kind) {
    case 'story':
      return `${entry.title}\n\n${entry.body}`;
    case 'note':
      return entry.body;
    case 'quote':
      return `${entry.body}\n${entry.attribution}`;
    case 'list':
      return `${entry.title}\n${entry.items.join('\n')}`;
  }
}

export function entryWords(entry: Entry): number {
  return countWords(entryText(entry));
}

export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Split body copy into paragraphs on blank lines (single newlines are kept as soft breaks). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function sentences(text: string): string[] {
  return (text.replace(/\s+/gu, ' ').match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/gu) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/gu, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const endsOnBoundary = clean.charAt(max - 1) === ' ';
  const lastSpace = cut.lastIndexOf(' ');
  return `${(endsOnBoundary || lastSpace <= max * 0.6 ? cut : cut.slice(0, lastSpace)).replace(/[,;:.\s]+$/u, '')}…`;
}

/** The first sentence, used as a standfirst/dek. */
export function dek(text: string, max = 180): string {
  const first = sentences(text)[0] ?? '';
  return truncate(first, max);
}

/**
 * Pick a sentence worth pulling out as a pull quote: medium length, from the
 * body (not the opener), preferring emphatic or first-person lines.
 */
export function pullQuote(text: string): string | null {
  const all = sentences(text);
  if (all.length < 4) return null;
  const candidates = all.slice(1).filter((s) => s.length >= 40 && s.length <= 150);
  if (candidates.length === 0) return null;
  const score = (s: string): number =>
    (/\b(I|we|my|never|always|everything|nothing)\b/u.test(s) ? 2 : 0) +
    (/[!?]/u.test(s) ? 1 : 0) +
    (1 - Math.abs(s.length - 95) / 95);
  const best = candidates.toSorted((a, b) => score(b) - score(a))[0];
  return best ? stripOuterQuotes(best) : null;
}

/**
 * Split text into segments marking case-insensitive matches of any whitespace-separated term in `query`.
 * Safe: never produces HTML.
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  const terms = [...new Set(query.trim().toLowerCase().split(/\s+/u).filter(Boolean))];
  if (terms.length === 0) return [{ text, match: false }];
  // Longest first so "breadcrumb" wins over "bread" when both are terms.
  const pattern = terms
    .toSorted((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('|');
  const parts = text.split(new RegExp(`(${pattern})`, 'giu'));
  return parts.filter((p) => p !== '').map((p) => ({ text: p, match: terms.includes(p.toLowerCase()) }));
}

/** Title Case for short headlines, keeping small words lowercase. */
export function titleCase(text: string): string {
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  return text
    .split(' ')
    .map((word, i) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/** Typeset straight quotes and apostrophes as curly ones, and double hyphens as em dashes. */
export function smartQuotes(text: string): string {
  return text
    .replace(/--/gu, '—')
    .replace(/(^|[\s([{—-])"/gu, '$1“')
    .replace(/"/gu, '”')
    .replace(/(^|[\s([{—-])'/gu, '$1‘')
    .replace(/'/gu, '’');
}

/** Remove quote marks wrapping a whole string (used where we add our own). */
export function stripOuterQuotes(text: string): string {
  return text.replace(/^["“‘']+/u, '').replace(/["”’']+$/u, '').trim();
}
