import { addDays, plural, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { HOPE_PATH, SEASON_PATH, onStageCount, prologueStats, sortSeasons, type Hope, type Season } from './seasons';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const seasons = (ctx: Readable) => ctx.data.collection<Season>(SEASON_PATH).all();
const hopes = (ctx: Readable) => ctx.data.collection<Hope>(HOPE_PATH).all();

export const prologue: ImprintDefinition = {
  id: 'prologue',
  name: 'PROLOGUE',
  functionLine: 'Hopes for the season',
  basePath: '/prologue/',
  release: 2,
  accent: { light: '#8e1b2a', dark: '#e05a6a' },
  intro: 'Each season opens like a play. Write what you hope it holds; close it with an epilogue.',
  load: () => import('./app/PrologueApp'),
  collections: [SEASON_PATH, HOPE_PATH],
  hasData: (ctx) => seasons(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const s of seasons(ctx)) {
      for (const d of [s.start, s.end]) {
        const i = ctx.weekIndexOf(d);
        if (i !== null) markers.set(i, 'season');
      }
    }
    return { markers };
  },

  weekLines(ctx, start, end) {
    const s = sortSeasons(seasons(ctx)).find((x) => x.start <= end && x.end >= start);
    if (!s) return [];
    const n = onStageCount(hopes(ctx), s.id);
    const short = s.name.replace(/\s+\d{4}$/u, '');
    return [{ imprint: 'prologue', text: `PROLOGUE · ${short}: ${n ? `${plural(n, 'hope')} on stage` : s.closedAt ? 'closed' : 'the season'}`, href: '/prologue/' }];
  },

  memories(ctx) {
    return seasons(ctx)
      .filter((s) => s.closedAt)
      .map((s) => ({ imprint: 'prologue' as const, id: s.id, date: s.end, title: `Epilogue · ${s.name}`, ...(s.epilogue ? { excerpt: s.epilogue.slice(0, 140) } : {}), href: `/prologue/playbill/${s.id}` }));
  },

  almanacFacts(ctx) {
    const all = seasons(ctx);
    if (!all.length) return [];
    const st = prologueStats(all, hopes(ctx));
    return [
      { imprint: 'prologue', label: 'Seasons closed', value: String(st.closed) },
      { imprint: 'prologue', label: 'Hopes that took a bow', value: String(st.bows), ...(st.letGo ? { note: `${st.letGo} let go, kindly` } : {}) },
    ];
  },

  redLetterDays(ctx) {
    return seasons(ctx)
      .filter((s) => !s.closedAt && s.end >= ctx.today && s.end <= addDays(ctx.today, 60))
      .map((s) => ({ imprint: 'prologue' as const, date: s.end, label: `${s.name} ends`, href: '/prologue/' }));
  },

  badge(ctx) {
    const open = seasons(ctx).find((s) => !s.closedAt && s.start <= ctx.today && s.end >= ctx.today);
    return open ? open.name.replace(/\s+\d{4}$/u, '') : null;
  },
};
