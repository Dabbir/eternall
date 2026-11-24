import { addDays, type ContributionContext, type ISODate, type LifelineMarker, type Memory, type ReadContext, type RedLetterDay, type Reminder, type WeekLine } from '@eternall/core';
import { DEFAULT_PREF, PERSON_PATH, PHOTO_PATH, PREF_PATH, SEEN_PATH, dueReminders, kindredStats, nextOccurrence, upcomingDates, type KindredPref, type Person, type Seen } from './people';

/** What People (once KINDRED) gives the house through AMAZEEN's definition (docs/adr/0014). */
export const PEOPLE_COLLECTIONS = [PERSON_PATH, SEEN_PATH, PHOTO_PATH, PREF_PATH] as const;

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[]; get(id: string): T | undefined } } };
export const peopleOf = (ctx: Readable) => ctx.data.collection<Person>(PERSON_PATH).all();
const seenOf = (ctx: Readable) => ctx.data.collection<Seen>(SEEN_PATH).all();
export const personHref = (id: string) => `/amazeen/people/${id}`;
const joinNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Weeks with someone seen carry the `person` marker. */
export function peopleMarkers(ctx: ContributionContext, markers: Map<number, LifelineMarker>): void {
  for (const s of seenOf(ctx)) {
    const i = ctx.weekIndexOf(s.date);
    if (i !== null && !markers.has(i)) markers.set(i, 'person');
  }
}

export function peopleWeekLines(ctx: ContributionContext, start: ISODate, end: ISODate): WeekLine[] {
  const byId = new Map(peopleOf(ctx).map((p) => [p.id, p.name]));
  const names = [...new Set(seenOf(ctx).filter((s) => s.date >= start && s.date <= end).map((s) => byId.get(s.personId)).filter((n): n is string => !!n))];
  return names.length ? [{ imprint: 'amazeen', text: `Saw ${joinNames(names.slice(0, 4))}${names.length > 4 ? ' and others' : ''}`, href: '/amazeen/people' }] : [];
}

export function peopleMemories(ctx: ReadContext): Memory[] {
  const byId = new Map(peopleOf(ctx).map((p) => [p.id, p.name]));
  return seenOf(ctx)
    .filter((s) => s.note && byId.has(s.personId))
    .map((s) => ({ imprint: 'amazeen' as const, id: `seen_${s.id}`, date: s.date, title: `With ${byId.get(s.personId)}`, excerpt: s.note, href: personHref(s.personId) }));
}

export function peopleFacts(ctx: ReadContext) {
  const all = peopleOf(ctx);
  if (!all.length) return [];
  const st = kindredStats(all, seenOf(ctx), ctx.today);
  return [
    { imprint: 'amazeen' as const, label: 'People on the wall', value: String(st.kept) },
    { imprint: 'amazeen' as const, label: 'People seen this year', value: String(st.seenThisYear) },
  ];
}

export function peopleRedLetterDays(ctx: ReadContext): RedLetterDay[] {
  return peopleOf(ctx).flatMap((p) =>
    p.dates
      .map((d) => ({ d, next: nextOccurrence(d, ctx.today) }))
      .filter((x): x is { d: (typeof p.dates)[number]; next: string } => !!x.next && x.next <= addDays(ctx.today, 365))
      .map(({ d, next }) => ({ imprint: 'amazeen' as const, date: next, label: `${p.name} · ${d.label}`, href: personHref(p.id) })),
  );
}

/** "Ana · today", "birthday in 3 d": the nearest date in the next two weeks. */
export function peopleBadge(ctx: ReadContext): string | null {
  const next = upcomingDates(peopleOf(ctx), ctx.today, 14)[0];
  return next ? (next.days === 0 ? `${next.person.name} · today` : `${next.label.toLowerCase()} in ${next.days} d`) : null;
}

export function peopleReminders(ctx: ReadContext): Reminder[] {
  const pref = ctx.data.collection<KindredPref>(PREF_PATH).get('pref') ?? DEFAULT_PREF;
  // Keys keep their `kindred_` prefix, so a reminder already delivered is never delivered again.
  return dueReminders(peopleOf(ctx), ctx.today, pref.remind);
}
