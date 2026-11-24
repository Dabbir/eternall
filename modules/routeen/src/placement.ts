import type { TimeOfDay } from './practices';

/**
 * Where each practice sits in the day's sky (ADR 0016): its time of day picks a third of the arc
 * (morning left, midday high, evening right); any time practices rest along the horizon. Within a
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
const HORIZON_ROW = 0.93;

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
        out.push({ id, x: 0.06 + 0.88 * ((i + 0.5) / n), y: HORIZON_ROW, labelAbove: false });
        return;
      }
      const [lo, hi] = ZONES[time];
      const x = lo + (hi - lo) * ((i + 0.5) / n);
      const outer = i % 2 === 1;
      out.push({ id, x, y: outer ? Math.max(0.04, arcY(x) - OUTER) : arcY(x), labelAbove: outer });
    });
  }
  return out;
}
