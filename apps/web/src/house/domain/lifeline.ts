import {
  WEEKS_PER_ROW,
  locateIndex,
  type ContributionContext,
  type HouseProfile,
  type ISODate,
  type LifelineLayer,
  type LifelineMarker,
  type ReadContext,
  type Tone,
} from '@eternall/core';
import { INSCRIPTION_PATH, type Inscription } from './house';

/** Everything the lifeline canvas paints, merged from the house and every enabled imprint. */
export interface LifelineModel {
  total: number;
  now: number;
  tones: Map<number, Tone>;
  bands: Map<number, { color: string; label: string }>;
  markers: Map<number, LifelineMarker>;
  /** Number of things recorded per week (for announcements and the week panel). */
  counts: Map<number, number>;
}

export const totalWeeks = (p: HouseProfile) => p.horizonYears * WEEKS_PER_ROW;

const MARKER_RANK: Record<LifelineMarker, number> = {
  'letter-ready': 9,
  'letter-sealed': 8,
  'chapter-start': 6,
  season: 5,
  person: 4,
  ritual: 3,
  work: 2,
  'letter-opened': 1,
};

export function contributionContext(ctx: ReadContext): ContributionContext {
  const p = ctx.profile;
  const total = p ? totalWeeks(p) : 0;
  return {
    ...ctx,
    weekIndexOf: (date: ISODate) => {
      if (!p) return null;
      const i = locateIndex(p.birthDate, date);
      return i === null || i >= total ? null : i;
    },
  };
}

/** House inscriptions: the dominant tone per week (most frequent; latest wins ties). */
export function inscriptionLayer(ctx: ContributionContext): { tones: Map<number, Tone>; counts: Map<number, number> } {
  const byWeek = new Map<number, Inscription[]>();
  for (const ins of ctx.data.collection<Inscription>(INSCRIPTION_PATH).all()) {
    const i = ctx.weekIndexOf(ins.date);
    if (i === null) continue;
    const list = byWeek.get(i);
    if (list) list.push(ins);
    else byWeek.set(i, [ins]);
  }
  const tones = new Map<number, Tone>();
  const counts = new Map<number, number>();
  for (const [i, list] of byWeek) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const tally = new Map<Tone, number>();
    let best = list[list.length - 1]!.tone;
    let bestN = 0;
    for (const ins of list) {
      const n = (tally.get(ins.tone) ?? 0) + 1;
      tally.set(ins.tone, n);
      if (n >= bestN) {
        best = ins.tone;
        bestN = n;
      }
    }
    tones.set(i, best);
    counts.set(i, list.length);
  }
  return { tones, counts };
}

export function buildLifeline(ctx: ContributionContext, layers: readonly LifelineLayer[]): LifelineModel | null {
  const p = ctx.profile;
  if (!p) return null;
  const total = totalWeeks(p);
  const now = Math.min(total - 1, ctx.weekIndexOf(ctx.today) ?? 0);
  const own = inscriptionLayer(ctx);
  const tones = new Map(own.tones);
  const counts = new Map(own.counts);
  const bands = new Map<number, { color: string; label: string }>();
  const markers = new Map<number, LifelineMarker>();

  for (const layer of layers) {
    // The house's own inscriptions take precedence; imprints fill weeks it left empty.
    for (const [i, t] of layer.tones ?? []) {
      if (!tones.has(i)) tones.set(i, t);
      counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    for (const [i, b] of layer.bands ?? []) bands.set(i, b);
    for (const [i, m] of layer.markers ?? []) {
      const prev = markers.get(i);
      if (!prev || MARKER_RANK[m] > MARKER_RANK[prev]) markers.set(i, m);
      counts.set(i, (counts.get(i) ?? 0) + 1);
    }
  }
  return { total, now, tones, bands, markers, counts };
}
