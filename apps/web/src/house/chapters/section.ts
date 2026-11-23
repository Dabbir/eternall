import { formatDuration, parseISO, plural, type HouseSection, type LifelineMarker } from '@eternall/core';
import { CHAPTER_PATH, chapterAt, clothColor, effectiveEnd, sortChapters, type Chapter } from './chapters';

const chapters = (ctx: { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } }) => ctx.data.collection<Chapter>(CHAPTER_PATH).all();
const hrefOf = (id: string) => `/chapters?open=${id}`;

/**
 * Chapters, a house section (once the FOLIO imprint; docs/adr/0011). The records keep their
 * `folio/chapter` path, so nothing moved in the vault. Bands colour the lifeline's chapters lens.
 */
export const chaptersSection: HouseSection = {
  id: 'chapters',
  name: 'Chapters',
  functionLine: 'The eras of your life',
  href: '/chapters',
  accent: { light: '#2f4a3a', dark: '#7fae8f' },
  collections: [CHAPTER_PATH],
  hasData: (ctx) => chapters(ctx).length > 0,

  lifeline(ctx) {
    const bands = new Map<number, { color: string; label: string }>();
    const markers = new Map<number, LifelineMarker>();
    for (const ch of sortChapters(chapters(ctx))) {
      const from = ctx.weekIndexOf(ch.start);
      const to = ctx.weekIndexOf(effectiveEnd(ch, ctx.today));
      if (from === null) continue;
      for (let i = from; i <= (to ?? from); i++) bands.set(i, { color: clothColor(ch.cloth), label: ch.title });
      markers.set(from, 'chapter-start');
    }
    return { bands, markers };
  },

  weekLines(ctx, start) {
    const ch = chapterAt(chapters(ctx), start, ctx.today);
    return ch ? [{ imprint: 'house', text: `Chapter · ${ch.title}`, href: hrefOf(ch.id) }] : [];
  },

  almanacFacts(ctx) {
    const all = chapters(ctx);
    if (!all.length) return [];
    const longest = [...all].sort((a, b) => parseISO(effectiveEnd(b, ctx.today)) - parseISO(b.start) - (parseISO(effectiveEnd(a, ctx.today)) - parseISO(a.start)))[0]!;
    return [
      { imprint: 'house', label: 'Chapters named', value: String(all.length) },
      { imprint: 'house', label: 'Longest chapter', value: longest.title, note: formatDuration(longest.start, effectiveEnd(longest, ctx.today)) },
    ];
  },

  badge(ctx) {
    const n = chapters(ctx).length;
    return n ? plural(n, 'chapter') : null;
  },

  provides(ctx) {
    return {
      'chapters.at': {
        at: (date: string) => {
          const ch = chapterAt(chapters(ctx), date, ctx.today);
          return ch ? { id: ch.id, title: ch.title, color: clothColor(ch.cloth), href: hrefOf(ch.id) } : null;
        },
      },
    };
  },
};
