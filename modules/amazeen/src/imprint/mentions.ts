/**
 * "@" mentions inside AMAZEEN, offered by KINDRED through `people.mention` (docs/ARCHITECTURE.md §5).
 * Picking someone writes their name as plain text; KINDRED finds the piece at read time, so nothing
 * is stored about the link and the text reads the same without KINDRED.
 */

/** The "@query" being typed just before the caret, or null. Needs a word boundary before "@". */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(?:^|[\s(“"'‘])@([\p{L}\p{M}'’.-]{0,30})$/u.exec(before);
  if (!m) return null;
  return { start: caret - m[1]!.length - 1, query: m[1]! };
}

/** Replace "@query" with the name (and a space), returning the new text and caret. */
export function applyMention(text: string, start: number, caret: number, name: string, max = Infinity): { text: string; caret: number } {
  const after = text.slice(caret);
  const insert = /^[\s.,;:!?)”’]/u.test(after) ? name : `${name} `;
  const next = `${text.slice(0, start)}${insert}${after}`;
  if (next.length > max) return { text, caret };
  return { text: next, caret: start + insert.length };
}
