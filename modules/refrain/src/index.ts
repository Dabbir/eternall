import { addDays, plural, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { MARK_PATH, RITUAL_PATH, barSummary, dueToday, isKeptIn, keptIn, keySet, markId, ritualStats, type Mark, type Ritual } from './rituals';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const rituals = (ctx: Readable) => ctx.data.collection<Ritual>(RITUAL_PATH).all();
const marks = (ctx: Readable) => ctx.data.collection<Mark>(MARK_PATH).all();

export const refrain: ImprintDefinition = {
  id: 'refrain',
  name: 'REFRAIN',
  functionLine: 'Rituals & habits',
  basePath: '/refrain/',
  release: 2,
  accent: { light: '#3b3a8f', dark: '#a6a4ff' },
  intro: 'Each line is a ritual. Each bar is a week. A note means you did it; a rest is part of the music.',
  brand: { icon: '/icons/refrain.svg', themeColor: { light: '#f7f4ec', dark: '#101016' }, lockTitle: 'The score is put away.', leaveLabel: 'Fine' },
  load: () => import('./app/RefrainApp'),
  collections: [RITUAL_PATH, MARK_PATH],
  hasData: (ctx) => rituals(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const m of marks(ctx)) {
      const i = ctx.weekIndexOf(m.date);
      if (i !== null) markers.set(i, 'ritual');
    }
    return { markers };
  },

  weekLines(ctx, start) {
    const s = barSummary(rituals(ctx), marks(ctx), start, ctx.today);
    if (!s.active || start > ctx.today) return [];
    return [{ imprint: 'refrain', text: `REFRAIN · ${s.kept} of ${plural(s.active, 'ritual')} kept`, href: '/refrain/' }];
  },

  almanacFacts(ctx) {
    const all = rituals(ctx);
    if (!all.length) return [];
    const s = ritualStats(all, marks(ctx), ctx.today);
    const facts = [
      { imprint: 'refrain' as const, label: 'Notes kept', value: String(s.totalMarks), note: `${s.keptThisYear} this year` },
    ];
    if (s.mostConstant) facts.push({ imprint: 'refrain', label: 'The steadiest refrain', value: s.mostConstant.ritual.name, note: `kept in ${Math.round(s.mostConstant.ratio * 100)}% of its weeks` });
    return facts;
  },

  badge(ctx) {
    const kept = keySet(marks(ctx));
    const left = dueToday(rituals(ctx), ctx.today).filter((r) => !kept.has(markId(r.id, ctx.today))).length;
    return left ? `${left} to mark today` : null;
  },

  provides(ctx) {
    return {
      'rituals.list': { list: () => rituals(ctx).map((r) => ({ id: r.id, name: r.name, href: `/refrain/ritual/${r.id}` })) },
      'rituals.week': {
        week: (id: string, start: string) => {
          const r = rituals(ctx).find((x) => x.id === id);
          if (!r) return null;
          const kept = keySet(marks(ctx).filter((m) => m.ritualId === id && m.date >= start && m.date <= addDays(start, 6)));
          return { kept: isKeptIn(r, start, kept, ctx.today), notes: keptIn(r, start, kept) };
        },
      },
    };
  },
};
