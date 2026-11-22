import { capsuleStatus } from './capsule';
import { effectiveEnd } from './validation';
import { WEEKS_PER_ROW, locateIndex, parseISO } from './time';
import type { AppData, Chapter, ISODate, Ink, Inscription, Profile, Tone } from './types';

/**
 * A flat, index-addressed model of every week on the lifeline.
 * Built once per data change and consumed by the canvas renderer and the week panel.
 */
export interface LifelineModel {
  total: number;
  /** Index of the current week. */
  now: number;
  /** Dominant tone per week (most frequent; latest wins ties) for weeks with inscriptions. */
  tones: Map<number, Tone>;
  inscriptionsByWeek: Map<number, Inscription[]>;
  /** Chapter ink per week. Later-starting chapters take precedence. */
  chapterInk: Map<number, Ink>;
  /** Capsule state per opening week: 'ready' outranks 'sealed' outranks 'opened'. */
  capsules: Map<number, 'sealed' | 'ready' | 'opened'>;
}

export function totalWeeks(p: Profile): number {
  return p.horizonYears * WEEKS_PER_ROW;
}

export function buildLifeline(data: AppData, today: ISODate): LifelineModel | null {
  const p = data.profile;
  if (!p) return null;
  const total = totalWeeks(p);
  const now = Math.min(total - 1, locateIndex(p.birthDate, today) ?? 0);

  const inscriptionsByWeek = new Map<number, Inscription[]>();
  for (const ins of data.inscriptions) {
    const idx = locateIndex(p.birthDate, ins.date);
    if (idx === null || idx >= total) continue;
    const list = inscriptionsByWeek.get(idx);
    if (list) list.push(ins);
    else inscriptionsByWeek.set(idx, [ins]);
  }
  const tones = new Map<number, Tone>();
  for (const [idx, list] of inscriptionsByWeek) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    tones.set(idx, dominantTone(list));
  }

  const chapterInk = new Map<number, Ink>();
  const ordered = [...data.chapters].sort((a, b) => a.start.localeCompare(b.start));
  for (const ch of ordered) {
    const [from, to] = chapterSpan(ch, p, today);
    for (let i = from; i <= to && i < total; i++) chapterInk.set(i, ch.ink);
  }

  const capsules = new Map<number, 'sealed' | 'ready' | 'opened'>();
  const rank = { opened: 0, sealed: 1, ready: 2 } as const;
  for (const c of data.capsules) {
    const idx = locateIndex(p.birthDate, c.opensOn);
    if (idx === null || idx >= total) continue;
    const s = capsuleStatus(c, today);
    const prev = capsules.get(idx);
    if (!prev || rank[s] > rank[prev]) capsules.set(idx, s);
  }

  return { total, now, tones, inscriptionsByWeek, chapterInk, capsules };
}

function dominantTone(list: readonly Inscription[]): Tone {
  const counts = new Map<Tone, number>();
  let best: Tone = list[list.length - 1]!.tone;
  let bestN = 0;
  for (const ins of list) {
    const n = (counts.get(ins.tone) ?? 0) + 1;
    counts.set(ins.tone, n);
    if (n >= bestN) {
      best = ins.tone;
      bestN = n;
    }
  }
  return best;
}

/** Inclusive week-index span of a chapter. */
export function chapterSpan(ch: Chapter, p: Profile, today: ISODate): [number, number] {
  const from = locateIndex(p.birthDate, ch.start) ?? 0;
  const to = locateIndex(p.birthDate, effectiveEnd(ch, today)) ?? from;
  return [from, Math.max(from, to)];
}

export function chapterAt(chapters: readonly Chapter[], p: Profile, index: number, today: ISODate): Chapter | null {
  let found: Chapter | null = null;
  for (const ch of chapters) {
    const [from, to] = chapterSpan(ch, p, today);
    if (index >= from && index <= to && (!found || parseISO(ch.start) > parseISO(found.start))) found = ch;
  }
  return found;
}
