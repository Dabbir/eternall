import type { TimeOfDay } from './practices';

/**
 * Where each practice sits in the day's sky (ADR 0016): its time of day picks a third of the arc
 * (morning left, midday high, evening right); any time practices rest in two low rows under the arc's
 * high middle, clear of its low ends, so no name lands on another body. Within a
 * zone bodies spread evenly and alternate between the arc and an outer orbit, so neighbours never
 * touch. Pure and stable: a mark never moves a body, and a new practice moves only its own zone.
 * x and y are fractions of the drawing: x from the left, y from the top (1 is the horizon).
 */
export interface Placed {
  id: string;
  x: number;
  y: number;
  labelAbove: boolean;
}

export const MIN_GAP = 0.06;

const ZONES: Record<Exclude<TimeOfDay, 'anytime'>, [number, number]> = { morning: [0.06, 0.33], midday: [0.36, 0.64], evening: [0.67, 0.94] };
const OUTER = 0.22;
/** Any-time practices rest in two low rows under the high middle of the arc, clear of its low ends. */
const ANYTIME: [number, number] = [0.22, 0.78];
const HORIZON_ROWS = [0.93, 0.8] as const;
/** A name above a body this high would leave the sky, so it goes under instead. */
const TOP_ROOM = 0.12;

/** The arc's height at x: on the horizon at 0.04 and 0.96, highest (0.22) at noon. */
export function arcY(x: number): number {
  const t = Math.min(1, Math.max(0, (x - 0.04) / 0.92));
  return 1 - 0.78 * Math.sin(Math.PI * t);
}

export function placeBodies(groups: readonly { time: TimeOfDay; practices: readonly { id: string }[] }[]): Placed[] {
  const out: Placed[] = [];
  for (const { time, practices } of groups) {
    const n = practices.length;
    practices.forEach(({ id }, i) => {
      if (time === 'anytime') {
        const [lo, hi] = ANYTIME;
        const row = i % 2;
        out.push({ id, x: lo + (hi - lo) * ((i + 0.5) / n), y: HORIZON_ROWS[row]!, labelAbove: row === 1 });
        return;
      }
      const [lo, hi] = ZONES[time];
      const x = lo + (hi - lo) * ((i + 0.5) / n);
      const outer = i % 2 === 1;
      const y = outer ? Math.max(0.04, arcY(x) - OUTER) : arcY(x);
      out.push({ id, x, y, labelAbove: outer && y > TOP_ROOM });
    });
  }
  return out;
}
