import { TONE_LABEL, parseISO, plural, type ImprintDefinition, type LifelineMarker, type Memory, type Tone } from '@eternall/core';
import { headlineFor, pickCoverStory } from './domain/issues';
import { weekKey } from './domain/dates';
import type { Entry } from './domain/types';
import { ENTRY_PATH, META_PATH, type AmazeenMeta } from './imprint/vaultAdapter';
import { LETTER_COLLECTIONS, letterFacts, letterMarkers, letterMemories, letterRedLetterDays, letterWeekLines, lettersOf, lettersReady } from './imprint/letters/contributions';

/** Mood (1 storm … 5 sunny) → the house's shared tones (docs/MODULES.md §2). */
export const MOOD_TONE: Record<1 | 2 | 3 | 4 | 5, Tone> = { 1: 'grief', 2: 'tender', 3: 'wonder', 4: 'calm', 5: 'joy' };

const entriesOf = (ctx: { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } }) => ctx.data.collection<Entry>(ENTRY_PATH).all();

const titleOf = (e: Entry): string => (e.kind === 'story' || e.kind === 'list' ? e.title : e.kind === 'quote' ? `“${e.body.slice(0, 80)}”` : e.body.slice(0, 80));
const textOf = (e: Entry): string => (e.kind === 'list' ? e.items.join(' · ') : e.body);
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function byIssue(entries: readonly Entry[]): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = weekKey(new Date(e.createdAt));
    out.set(k, [...(out.get(k) ?? []), e]);
  }
  return out;
}

export const amazeen: ImprintDefinition = {
  id: 'amazeen',
  name: 'AMAZEEN',
  functionLine: 'Journal',
  basePath: '/amazeen/',
  release: 1,
  accent: { light: '#b92e1a', dark: '#ff6b55' },
  intro: 'The weekly magazine of your own life. Write a little every day; on Sunday at midnight the week goes to press as an issue.',
  brand: { icon: '/icons/amazeen.svg', themeColor: { light: '#efe9dd', dark: '#121110' }, lockTitle: 'The newsroom is locked.', leaveLabel: 'Leave the newsroom' },
  load: () => import('./imprint/AmazeenApp'),
  collections: [ENTRY_PATH, META_PATH, ...LETTER_COLLECTIONS],
  hasData: (ctx) => entriesOf(ctx).length > 0 || lettersOf(ctx).length > 0 || !!ctx.data.collection<AmazeenMeta>(META_PATH).get('main')?.magazine,

  lifeline(ctx) {
    const tones = new Map<number, Tone>();
    const markers = new Map<number, LifelineMarker>();
    for (const list of byIssue(entriesOf(ctx)).values()) {
      // An issue belongs to the lifeline week of its last piece (the week it went to press).
      const last = list.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
      const i = ctx.weekIndexOf(dayOf(last.createdAt));
      if (i === null) continue;
      const mood = Math.round(list.reduce((s, e) => s + e.mood, 0) / list.length) as 1 | 2 | 3 | 4 | 5;
      tones.set(i, MOOD_TONE[mood]);
    }
    letterMarkers(ctx, markers);
    return { tones, markers };
  },

  weekLines(ctx, start, end) {
    const s = parseISO(start);
    const e = parseISO(end);
    const out = [];
    for (const [key, list] of byIssue(entriesOf(ctx))) {
      const inWeek = list.filter((x) => {
        const d = parseISO(dayOf(x.createdAt));
        return d >= s && d <= e;
      });
      if (!inWeek.length) continue;
      const cover = pickCoverStory(list);
      out.push({
        imprint: 'amazeen' as const,
        text: `${plural(inWeek.length, 'piece')} · ${cover ? `“${headlineFor(cover)}”` : key}`,
        href: `/amazeen/issue/${key}`,
      });
    }
    return [...out, ...letterWeekLines(ctx, start, end)];
  },

  memories(ctx): Memory[] {
    return [...letterMemories(ctx), ...entriesOf(ctx).map((e): Memory => ({
      imprint: 'amazeen',
      id: e.id,
      date: dayOf(e.createdAt),
      title: titleOf(e),
      excerpt: textOf(e).slice(0, 240),
      tone: MOOD_TONE[e.mood],
      href: `/amazeen/edit/${encodeURIComponent(e.id)}`,
    }))];
  },

  almanacFacts(ctx) {
    const entries = entriesOf(ctx);
    if (!entries.length) return letterFacts(ctx);
    const words = entries.reduce((s, e) => s + textOf(e).split(/\s+/).filter(Boolean).length + (e.kind === 'story' ? e.title.split(/\s+/).length : 0), 0);
    const moods = entries.reduce<Record<number, number>>((m, e) => ({ ...m, [e.mood]: (m[e.mood] ?? 0) + 1 }), {});
    const top = Number(Object.entries(moods).toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 3) as 1 | 2 | 3 | 4 | 5;
    return [
      { imprint: 'amazeen', label: 'Issues published', value: String(byIssue(entries).size) },
      { imprint: 'amazeen', label: 'Words written', value: words.toLocaleString('en-GB') },
      { imprint: 'amazeen', label: 'Usual weather', value: TONE_LABEL[MOOD_TONE[top]] },
      ...letterFacts(ctx),
    ];
  },

  redLetterDays: letterRedLetterDays,

  badge(ctx) {
    const ready = lettersReady(ctx);
    if (ready) return `${plural(ready, 'letter')} ready`;
    const n = entriesOf(ctx).filter((e) => weekKey(new Date(e.createdAt)) === weekKey(new Date())).length;
    return n ? `${plural(n, 'piece')} this week` : null;
  },
};
