import { formatDuration, parseISO, plural, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { CHAPTER_PATH, chapterAt, clothColor, effectiveEnd, sortChapters, type Chapter } from './chapters';

const chapters = (ctx: { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } }) => ctx.data.collection<Chapter>(CHAPTER_PATH).all();

export const folio: ImprintDefinition = {
  id: 'folio',
  name: 'FOLIO',
  functionLine: 'Chapters of your life',
  basePath: '/folio/',
  release: 1,
  accent: { light: '#2f4a3a', dark: '#7fae8f' },
  intro: 'Each book on this shelf is a chapter of your life. Name the eras and they colour your lifeline.',
  load: () => import('./app/FolioApp'),
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
    return ch ? [{ imprint: 'folio', text: `Chapter · ${ch.title}`, href: `/folio/chapter/${ch.id}` }] : [];
  },

  almanacFacts(ctx) {
    const all = chapters(ctx);
    if (!all.length) return [];
    const longest = [...all].sort((a, b) => parseISO(effectiveEnd(b, ctx.today)) - parseISO(b.start) - (parseISO(effectiveEnd(a, ctx.today)) - parseISO(a.start)))[0]!;
    return [
      { imprint: 'folio', label: 'Chapters named', value: String(all.length) },
      { imprint: 'folio', label: 'Longest chapter', value: longest.title, note: formatDuration(longest.start, effectiveEnd(longest, ctx.today)) },
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
          return ch ? { id: ch.id, title: ch.title, color: clothColor(ch.cloth), href: `/folio/chapter/${ch.id}` } : null;
        },
      },
    };
  },
};
