import { formatMedium, plural, parseISO, type ImprintDefinition, type LifelineMarker, type WeekLine } from '@eternall/core';
import { LETTER_PATH, DRAFT_PATH, letterStatus, sortLetters, type Letter } from './letters';

const letters = (ctx: { data: { collection<T extends { id: string }>(p: string): { all(): readonly T[] } } }) => ctx.data.collection<Letter>(LETTER_PATH).all();

export const envoi: ImprintDefinition = {
  id: 'envoi',
  name: 'ENVOI',
  functionLine: 'Letters to your future',
  basePath: '/envoi/',
  release: 1,
  accent: { light: '#b3202f', dark: '#f06a5a' },
  intro: 'Each envelope is a letter to your future self. It stays sealed — even to you — until the day you choose.',
  load: () => import('./app/EnvoiApp'),
  collections: [LETTER_PATH, DRAFT_PATH],
  hasData: (ctx) => letters(ctx).length > 0,

  lifeline(ctx) {
    const markers = new Map<number, LifelineMarker>();
    const rank: Record<LifelineMarker, number> = { 'letter-ready': 3, 'letter-sealed': 2, 'letter-opened': 1 } as Record<LifelineMarker, number>;
    for (const l of letters(ctx)) {
      const i = ctx.weekIndexOf(l.opensOn);
      if (i === null) continue;
      const s = letterStatus(l, ctx.today);
      const m: LifelineMarker = s === 'ready' ? 'letter-ready' : s === 'sealed' ? 'letter-sealed' : 'letter-opened';
      const prev = markers.get(i);
      if (!prev || rank[m] > rank[prev]) markers.set(i, m);
    }
    return { markers };
  },

  weekLines(ctx, start, end) {
    const out: WeekLine[] = [];
    const s = parseISO(start);
    const e = parseISO(end);
    for (const l of letters(ctx)) {
      const d = parseISO(l.opensOn);
      if (d < s || d > e) continue;
      const st = letterStatus(l, ctx.today);
      out.push({
        imprint: 'envoi',
        text: st === 'ready' ? `A letter is ready · “${l.title}”` : st === 'sealed' ? `A letter opens · “${l.title}”` : `Opened · “${l.title}”`,
        href: `/envoi/letter/${l.id}`,
        ...(st === 'ready' ? { emphasis: 'ready' as const } : {}),
      });
    }
    return out;
  },

  memories(ctx) {
    return letters(ctx)
      .filter((l) => l.openedAt)
      .map((l) => ({ imprint: 'envoi' as const, id: l.id, date: l.openedAt!.slice(0, 10), title: l.title, href: `/envoi/letter/${l.id}` }));
  },

  almanacFacts(ctx) {
    const all = letters(ctx);
    if (!all.length) return [];
    const waiting = all.filter((l) => letterStatus(l, ctx.today) === 'sealed');
    const next = sortLetters(waiting, ctx.today)[0];
    return [
      { imprint: 'envoi', label: 'Letters waiting', value: String(waiting.length) },
      { imprint: 'envoi', label: 'Letters opened', value: String(all.filter((l) => l.openedAt).length) },
      ...(next ? [{ imprint: 'envoi' as const, label: 'Next letter opens', value: formatMedium(next.opensOn) }] : []),
    ];
  },

  redLetterDays(ctx) {
    return letters(ctx)
      .filter((l) => letterStatus(l, ctx.today) === 'sealed')
      .map((l) => ({ imprint: 'envoi' as const, date: l.opensOn, label: `A letter opens · “${l.title}”`, href: `/envoi/letter/${l.id}` }));
  },

  badge(ctx) {
    const n = letters(ctx).filter((l) => letterStatus(l, ctx.today) === 'ready').length;
    return n ? plural(n, 'letter') + ' ready' : null;
  },

  provides(ctx) {
    return {
      'letters.compose': {
        compose: (prefill: { title?: string; body?: string }) => {
          const q = new URLSearchParams();
          if (prefill.title) q.set('title', prefill.title);
          if (prefill.body) q.set('body', prefill.body.slice(0, 2000));
          ctx.navigate(`/envoi/write?${q}`);
        },
      },
    };
  },
};

