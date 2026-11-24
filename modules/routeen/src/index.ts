import type { AlmanacFact, ImprintDefinition, LifelineMarker } from '@eternall/core';
import { copy } from './copy';
import { indexMarks, isKeptInWeek, litDays, marksInWeek, steadiest, weekSummary } from './days';
import { frontPage } from './front';
import { LOOK_PATH } from './look';
import { DAY_MODE_PATH, MODE_PATH, modeOfFn, type DayModeRecord, type ModeRecord } from './modes';
import { MARK_PATH, PRACTICE_PATH, barStart, type Mark, type Practice } from './practices';
import { SETTINGS_PATH, readSettings, routineDay } from './sky';

/** The moment contributions read; tests replace `now`. */
export const clock = { now: (): Date => new Date() };

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const all = <T extends { id: string }>(ctx: Readable, path: string) => ctx.data.collection<T>(path).all();
const practices = (ctx: Readable) => all<Practice>(ctx, PRACTICE_PATH);
const marks = (ctx: Readable) => all<Mark>(ctx, MARK_PATH);
/** Marks of practices still here: a removed practice keeps its marks (Undo, export) but lights nothing. */
const liveMarks = (ctx: Readable) => {
  const here = new Set(practices(ctx).map((p) => p.id));
  return marks(ctx).filter((m) => here.has(m.ritualId));
};
const settings = (ctx: Readable) => readSettings(all<{ id: string }>(ctx, SETTINGS_PATH).find((s) => s.id === 'settings'));

function front(ctx: Readable) {
  const now = clock.now();
  const modes = all<ModeRecord>(ctx, MODE_PATH);
  const dayModes = all<DayModeRecord>(ctx, DAY_MODE_PATH);
  const dayEndsAt = settings(ctx).dayEndsAt;
  return { page: frontPage({ practices: practices(ctx), marks: marks(ctx), modes, dayModes, now, dayEndsAt }), modeOf: modeOfFn(modes, dayModes), today: routineDay(now, dayEndsAt) };
}

/**
 * ROUTEEN (docs/design/routeen.md, ADR 0014; once REFRAIN): Langit Hari, a routine that bends with your day.
 * Records keep their `refrain/*` paths; the capabilities keep their names.
 */
export const routeen: ImprintDefinition = {
  id: 'routeen',
  name: 'ROUTEEN',
  label: 'Practices',
  functionLine: copy.fn,
  basePath: '/routeen/',
  release: 2,
  accent: { light: '#9a5a14', dark: '#f0b968' },
  intro: copy.intro,
  brand: { icon: '/icons/routeen.svg', themeColor: { light: '#f8efe8', dark: '#1a1618' }, lockTitle: copy.lock, leaveLabel: copy.leave },
  load: () => import('./app/RouteenApp'),
  collections: [PRACTICE_PATH, MARK_PATH, LOOK_PATH, MODE_PATH, DAY_MODE_PATH, SETTINGS_PATH],
  hasData: (ctx) => practices(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const m of liveMarks(ctx)) {
      const i = ctx.weekIndexOf(m.date);
      if (i !== null) markers.set(i, 'ritual');
    }
    return { markers };
  },

  weekLines(ctx, start) {
    const { modeOf, today } = front(ctx);
    const s = weekSummary(practices(ctx), indexMarks(marks(ctx)), start, today, modeOf);
    if (!s.active || start > today) return [];
    return [{ imprint: 'routeen', text: copy.weekLine(s.kept, s.active), href: '/routeen/' }];
  },

  almanacFacts(ctx) {
    const ps = practices(ctx);
    if (!ps.length) return [];
    const { modeOf, today } = front(ctx);
    const year = today.slice(0, 4);
    const facts: AlmanacFact[] = [{ imprint: 'routeen', label: copy.almanac.daysLit, value: String(litDays(liveMarks(ctx), year)), note: copy.almanac.daysLitNote(Number(year)) }];
    const best = steadiest(ps, indexMarks(marks(ctx)), today, modeOf);
    if (best) facts.push({ imprint: 'routeen', label: copy.almanac.steadiest, value: best.practice.name, note: copy.almanac.steadiestNote(best.weeks) });
    return facts;
  },

  home(ctx) {
    if (!practices(ctx).length) return { status: copy.empty, action: { label: copy.newPractice, href: '/routeen/?new=1' } };
    const { page } = front(ctx);
    const status = page.mode === 'off' ? copy.home.dayOff : page.dueCount ? copy.home.status(page.markedDueCount, page.dueCount) : copy.home.nothingDue;
    return { status, action: { label: copy.markToday, href: '/routeen/' } };
  },

  badge(ctx) {
    const { page } = front(ctx);
    const left = page.mode === 'off' ? 0 : page.dueCount - page.markedDueCount;
    return left > 0 ? copy.home.badge(left) : null;
  },

  provides(ctx) {
    return {
      'rituals.list': { list: () => practices(ctx).map((p) => ({ id: p.id, name: p.name, href: `/routeen/practice/${p.id}` })) },
      'rituals.week': {
        week: (id: string, start: string) => {
          const p = practices(ctx).find((x) => x.id === id);
          if (!p) return null;
          const { modeOf, today } = front(ctx);
          const idx = indexMarks(marks(ctx));
          const s = barStart(start);
          return { kept: isKeptInWeek(p, s, idx, today, modeOf), notes: marksInWeek(p, s, idx) };
        },
      },
    };
  },
};
