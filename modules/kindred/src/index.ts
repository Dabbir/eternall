import { addDays, type ImprintDefinition, type LifelineMarker } from '@eternall/core';
import { DEFAULT_PREF, PERSON_PATH, PHOTO_PATH, PREF_PATH, SEEN_PATH, dueReminders, kindredStats, nextOccurrence, searchPeople, upcomingDates, type KindredPref, type Person, type Seen } from './people';

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
const people = (ctx: Readable) => ctx.data.collection<Person>(PERSON_PATH).all();
const seen = (ctx: Readable) => ctx.data.collection<Seen>(SEEN_PATH).all();

const joinNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

export const kindred: ImprintDefinition = {
  id: 'kindred',
  name: 'KINDRED',
  functionLine: 'The people who matter',
  basePath: '/kindred/',
  release: 2,
  accent: { light: '#1f5f5b', dark: '#6fc2b8' },
  intro: 'KINDRED is for you. People you add never receive anything and are never contacted. The drawers along the bottom take you between the card file and the constellation.',
  brand: { icon: '/icons/kindred.svg', themeColor: { light: '#f6f2ea', dark: '#111615' }, lockTitle: 'The card file is locked.', leaveLabel: 'Close the drawer' },
  load: () => import('./app/KindredApp'),
  collections: [PERSON_PATH, SEEN_PATH, PHOTO_PATH, PREF_PATH],
  hasData: (ctx) => people(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    for (const s of seen(ctx)) {
      const i = ctx.weekIndexOf(s.date);
      if (i !== null) markers.set(i, 'person');
    }
    return { markers };
  },

  weekLines(ctx, start, end) {
    const byId = new Map(people(ctx).map((p) => [p.id, p.name]));
    const names = [...new Set(seen(ctx).filter((s) => s.date >= start && s.date <= end).map((s) => byId.get(s.personId)).filter((n): n is string => !!n))];
    return names.length ? [{ imprint: 'kindred', text: `KINDRED · Saw ${joinNames(names.slice(0, 4))}${names.length > 4 ? ' and others' : ''}`, href: '/kindred/' }] : [];
  },

  memories(ctx) {
    const byId = new Map(people(ctx).map((p) => [p.id, p.name]));
    return seen(ctx)
      .filter((s) => s.note && byId.has(s.personId))
      .map((s) => ({ imprint: 'kindred' as const, id: s.id, date: s.date, title: `With ${byId.get(s.personId)}`, excerpt: s.note, href: `/kindred/person/${s.personId}` }));
  },

  almanacFacts(ctx) {
    const all = people(ctx);
    if (!all.length) return [];
    const st = kindredStats(all, seen(ctx), ctx.today);
    return [
      { imprint: 'kindred', label: 'People kept close', value: String(st.kept) },
      { imprint: 'kindred', label: 'People seen this year', value: String(st.seenThisYear) },
    ];
  },

  redLetterDays(ctx) {
    return people(ctx).flatMap((p) =>
      p.dates
        .map((d) => ({ d, next: nextOccurrence(d, ctx.today) }))
        .filter((x): x is { d: (typeof p.dates)[number]; next: string } => !!x.next && x.next <= addDays(ctx.today, 365))
        .map(({ d, next }) => ({ imprint: 'kindred' as const, date: next, label: `${p.name} · ${d.label}`, href: `/kindred/person/${p.id}` })),
    );
  },

  badge(ctx) {
    const next = upcomingDates(people(ctx), ctx.today, 14)[0];
    return next ? (next.days === 0 ? `${next.person.name} · today` : `${next.label.toLowerCase()} in ${next.days} d`) : null;
  },

  reminders(ctx) {
    const pref = ctx.data.collection<KindredPref>(PREF_PATH).get('pref') ?? DEFAULT_PREF;
    return dueReminders(people(ctx), ctx.today, pref.remind);
  },

  provides(ctx) {
    return {
      'people.mention': {
        search: (q: string) => searchPeople(people(ctx), q).map((p) => ({ id: p.id, name: p.name })),
        nameOf: (id: string) => people(ctx).find((p) => p.id === id)?.name ?? null,
        href: (id: string) => `/kindred/person/${id}`,
      },
    };
  },
};
