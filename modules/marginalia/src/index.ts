import { plural, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { KIND_LABEL, PREF_PATH, UNDERLINE_PATH, WORK_PATH, currentlyReading, dayOf, marginaliaStats, offeredQuotes, type Underline, type Work } from './works';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const works = (ctx: Readable) => ctx.data.collection<Work>(WORK_PATH).all();
const underlines = (ctx: Readable) => ctx.data.collection<Underline>(UNDERLINE_PATH).all();

export const marginalia: ImprintDefinition = {
  id: 'marginalia',
  name: 'MARGINALIA',
  label: 'Reading',
  functionLine: 'Reading & underlines',
  basePath: '/marginalia/',
  release: 2,
  accent: { light: '#1d4ea8', dark: '#8db0ff' },
  intro: 'Every work you take in gets a catalogue card. Open one to keep the lines you underlined, with your notes in the margin.',
  brand: { icon: '/icons/marginalia.svg', themeColor: { light: '#f8f5ee', dark: '#121110' }, lockTitle: 'The stacks are closed.', leaveLabel: 'Back to the stacks' },
  load: () => import('./app/MarginaliaApp'),
  collections: [WORK_PATH, UNDERLINE_PATH, PREF_PATH],
  hasData: (ctx) => works(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const w of works(ctx)) {
      const i = w.finished ? ctx.weekIndexOf(w.finished) : null;
      if (i !== null) markers.set(i, 'work');
    }
    return { markers };
  },

  weekLines(ctx, start, end) {
    return works(ctx)
      .filter((w) => w.finished && w.finished >= start && w.finished <= end)
      .slice(0, 3)
      .map((w) => ({ imprint: 'marginalia' as const, text: `MARGINALIA · Finished ${w.title}`, href: `/marginalia/work/${w.id}` }));
  },

  memories(ctx) {
    const byId = new Map(works(ctx).map((w) => [w.id, w]));
    const finished = works(ctx)
      .filter((w) => w.finished)
      .map((w) => ({ imprint: 'marginalia' as const, id: w.id, date: w.finished!, title: `Finished ${w.title}`, ...(w.by ? { excerpt: w.by } : {}), href: `/marginalia/work/${w.id}` }));
    const lines = underlines(ctx)
      .filter((u) => byId.has(u.workId))
      .map((u) => ({ imprint: 'marginalia' as const, id: u.id, date: dayOf(u.createdAt), title: `Underlined in ${byId.get(u.workId)!.title}`, excerpt: u.text.slice(0, 140), href: `/marginalia/work/${u.workId}` }));
    return [...finished, ...lines];
  },

  almanacFacts(ctx) {
    const all = works(ctx);
    if (!all.length) return [];
    const st = marginaliaStats(all, underlines(ctx), ctx.today);
    const kinds = [...st.byKind.entries()].map(([k, n]) => `${n} ${KIND_LABEL[k].toLowerCase()}${n === 1 ? '' : 's'}`).join(', ');
    const facts = [{ imprint: 'marginalia' as const, label: 'Works finished this year', value: String(st.finishedThisYear), ...(kinds ? { note: kinds } : {}) }];
    if (st.mostUnderlined?.work) facts.push({ imprint: 'marginalia', label: 'Most underlined', value: st.mostUnderlined.work.title, note: plural(st.mostUnderlined.count, 'underline') });
    return facts;
  },

  badge(ctx) {
    const now = currentlyReading(works(ctx))[0];
    return now ? `reading ${now.title.length > 18 ? `${now.title.slice(0, 17)}…` : now.title}` : null;
  },

  provides(ctx) {
    return { 'quotes.offer': { offered: () => offeredQuotes(works(ctx), underlines(ctx)) } };
  },
};
