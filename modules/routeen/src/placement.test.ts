import { MIN_GAP, arcY, placeBodies } from './placement';
import type { TimeOfDay } from './practices';

const g = (time: TimeOfDay, ...ids: string[]) => ({ time, practices: ids.map((id) => ({ id })) });
const at = (ps: ReturnType<typeof placeBodies>, id: string) => ps.find((p) => p.id === id)!;

it('places each zone in its third', () => {
  const ps = placeBodies([g('morning', 'a', 'b'), g('midday', 'c'), g('evening', 'd', 'e')]);
  for (const id of ['a', 'b']) expect(at(ps, id).x).toBeLessThan(0.34);
  expect(at(ps, 'c').x).toBeGreaterThan(0.35);
  expect(at(ps, 'c').x).toBeLessThan(0.65);
  for (const id of ['d', 'e']) expect(at(ps, id).x).toBeGreaterThan(0.66);
});
it('is stable for the same practices', () => {
  const groups = [g('morning', 'a'), g('anytime', 'b', 'c')];
  expect(placeBodies(groups)).toEqual(placeBodies(groups));
});
it('keeps fifteen bodies apart', () => {
  const ps = placeBodies([g('morning', 'm1', 'm2', 'm3', 'm4', 'm5'), g('evening', 'e1', 'e2', 'e3', 'e4', 'e5'), g('anytime', 'a1', 'a2', 'a3', 'a4', 'a5')]);
  expect(ps).toHaveLength(15);
  for (const p of ps) for (const q of ps) if (p !== q) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(MIN_GAP);
});
it('leaves the morning where it was when an evening practice is added', () => {
  const before = placeBodies([g('morning', 'a', 'b')]);
  const after = placeBodies([g('morning', 'a', 'b'), g('evening', 'c')]);
  expect(after.filter((p) => p.id !== 'c')).toEqual(before);
});
it('puts labels above the bodies on the outer orbit, below the rest', () => {
  const ps = placeBodies([g('morning', 'a', 'b'), g('anytime', 'c')]);
  expect(at(ps, 'a').labelAbove).toBe(false);
  expect(at(ps, 'b').labelAbove).toBe(true);
  expect(at(ps, 'c').labelAbove).toBe(false);
});
it('draws the arc high at noon and on the horizon at its ends', () => {
  expect(arcY(0.5)).toBeCloseTo(0.22, 2);
  expect(arcY(0.04)).toBeCloseTo(1, 5);
  expect(arcY(0)).toBeCloseTo(1, 5);
});
