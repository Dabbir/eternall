import { formatMedium, parseISO, type AlmanacFact, type ContributionContext, type LifelineMarker, type Memory, type ReadContext, type RedLetterDay, type WeekLine } from '@eternall/core';
import { DRAFT_PATH, LETTER_PATH, letterStatus, sortLetters, type Letter } from './letters';

/** What the Letters room adds to the house (moved here with ENVOI; records keep their `envoi/*` paths). */
export const LETTER_COLLECTIONS = [LETTER_PATH, DRAFT_PATH] as const;
export const letterHref = (id: string) => `/amazeen/letters/letter/${id}`;

type Readable = { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } };
export const lettersOf = (ctx: Readable) => ctx.data.collection<Letter>(LETTER_PATH).all();

const RANK: Partial<Record<LifelineMarker, number>> = { 'letter-ready': 3, 'letter-sealed': 2, 'letter-opened': 1 };

/** Adds letter markers to `markers`, keeping the most urgent one per week. */
export function letterMarkers(ctx: ContributionContext, markers: Map<number, LifelineMarker>): void {
  for (const l of lettersOf(ctx)) {
    const i = ctx.weekIndexOf(l.opensOn);
    if (i === null) continue;
    const s = letterStatus(l, ctx.today);
    const m: LifelineMarker = s === 'ready' ? 'letter-ready' : s === 'sealed' ? 'letter-sealed' : 'letter-opened';
    const prev = markers.get(i);
    if (!prev || (RANK[m] ?? 0) > (RANK[prev] ?? 0)) markers.set(i, m);
  }
}

export function letterWeekLines(ctx: ContributionContext, start: string, end: string): WeekLine[] {
  const s = parseISO(start);
  const e = parseISO(end);
  const out: WeekLine[] = [];
  for (const l of lettersOf(ctx)) {
    const d = parseISO(l.opensOn);
    if (d < s || d > e) continue;
    const st = letterStatus(l, ctx.today);
    out.push({
      imprint: 'amazeen',
      text: st === 'ready' ? `A letter is ready · “${l.title}”` : st === 'sealed' ? `A letter opens · “${l.title}”` : `Opened · “${l.title}”`,
      href: letterHref(l.id),
      ...(st === 'ready' ? { emphasis: 'ready' as const } : {}),
    });
  }
  return out;
}

export const letterMemories = (ctx: ReadContext): Memory[] =>
  lettersOf(ctx)
    .filter((l) => l.openedAt)
    .map((l) => ({ imprint: 'amazeen', id: l.id, date: l.openedAt!.slice(0, 10), title: l.title, href: letterHref(l.id) }));

export function letterFacts(ctx: ReadContext): AlmanacFact[] {
  const all = lettersOf(ctx);
  if (!all.length) return [];
  const waiting = all.filter((l) => letterStatus(l, ctx.today) === 'sealed');
  const next = sortLetters(waiting, ctx.today)[0];
  return [
    { imprint: 'amazeen', label: 'Letters waiting', value: String(waiting.length) },
    { imprint: 'amazeen', label: 'Letters opened', value: String(all.filter((l) => l.openedAt).length) },
    ...(next ? [{ imprint: 'amazeen' as const, label: 'Next letter opens', value: formatMedium(next.opensOn) }] : []),
  ];
}

export const letterRedLetterDays = (ctx: ReadContext): RedLetterDay[] =>
  lettersOf(ctx)
    .filter((l) => letterStatus(l, ctx.today) === 'sealed')
    .map((l) => ({ imprint: 'amazeen', date: l.opensOn, label: `A letter opens · “${l.title}”`, href: letterHref(l.id) }));

export const lettersReady = (ctx: ReadContext) => lettersOf(ctx).filter((l) => letterStatus(l, ctx.today) === 'ready').length;
