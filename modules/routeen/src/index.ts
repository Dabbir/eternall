import { addDays, plural, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { MARK_PATH, PRACTICE_PATH, barSummary, dueToday, isKeptIn, keptIn, keySet, markId, practiceStats, type Mark, type Practice } from './practices';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const practices = (ctx: Readable) => ctx.data.collection<Practice>(PRACTICE_PATH).all();
const marks = (ctx: Readable) => ctx.data.collection<Mark>(MARK_PATH).all();

/**
 * ROUTEEN (docs/design/routeen.md, ADR 0014; once REFRAIN): practices woven on a loom, a thread each,
 * a row a day. Records keep their `refrain/*` paths; the capabilities keep their names.
 */
export const routeen: ImprintDefinition = {
  id: 'routeen',
  name: 'ROUTEEN',
  label: 'Practices',
  functionLine: 'Practices, woven daily',
  basePath: '/routeen/',
  release: 2,
  accent: { light: '#2e4a7d', dark: '#9db4e3' },
  intro: 'Each practice is a thread on the loom, and every day weaves a row. A day you kept is a coloured stitch; a day that passed shows the bare warp. Nothing breaks.',
  brand: { icon: '/icons/routeen.svg', themeColor: { light: '#efe8da', dark: '#15130f' }, lockTitle: 'The loom is covered.', leaveLabel: 'Leave the loom' },
  load: () => import('./app/RouteenApp'),
  collections: [PRACTICE_PATH, MARK_PATH],
  hasData: (ctx) => practices(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const m of marks(ctx)) {
      const i = ctx.weekIndexOf(m.date);
      if (i !== null) markers.set(i, 'ritual');
    }
    return { markers };
  },

  weekLines(ctx, start) {
    const s = barSummary(practices(ctx), marks(ctx), start, ctx.today);
    if (!s.active || start > ctx.today) return [];
    return [{ imprint: 'routeen', text: `ROUTEEN · ${s.kept} of ${plural(s.active, 'practice')} kept`, href: '/routeen/' }];
  },

  almanacFacts(ctx) {
    const all = practices(ctx);
    if (!all.length) return [];
    const s = practiceStats(all, marks(ctx), ctx.today);
    const facts = [{ imprint: 'routeen' as const, label: 'Stitches woven', value: String(s.totalMarks), note: `${s.keptThisYear} this year` }];
    if (s.mostConstant) facts.push({ imprint: 'routeen', label: 'The steadiest thread', value: s.mostConstant.practice.name, note: `kept in ${Math.round(s.mostConstant.ratio * 100)}% of its weeks` });
    return facts;
  },

  badge(ctx) {
    const kept = keySet(marks(ctx));
    const left = dueToday(practices(ctx), ctx.today).filter((p) => !kept.has(markId(p.id, ctx.today))).length;
    return left ? `${left} to weave today` : null;
  },

  provides(ctx) {
    return {
      'rituals.list': { list: () => practices(ctx).map((p) => ({ id: p.id, name: p.name, href: `/routeen/practice/${p.id}` })) },
      'rituals.week': {
        week: (id: string, start: string) => {
          const p = practices(ctx).find((x) => x.id === id);
          if (!p) return null;
          const kept = keySet(marks(ctx).filter((m) => m.ritualId === id && m.date >= start && m.date <= addDays(start, 6)));
          return { kept: isKeptIn(p, start, kept, ctx.today), notes: keptIn(p, start, kept) };
        },
      },
    };
  },
};
