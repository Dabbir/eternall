import { describe, expect, it } from 'vitest';
import { domePosition } from './skyScene';

describe('domePosition', () => {
  it('places 52 weeks around the dome and seven days up its side', () => {
    const [x0, y0] = domePosition(0, 0);
    const [x1, , z1] = domePosition(13, 0);
    expect(Math.hypot(x0, y0)).toBeGreaterThan(0);
    expect(domePosition(0, 6)[1]).toBeGreaterThan(domePosition(0, 0)[1]);
    expect(Math.atan2(z1, x1)).not.toBeCloseTo(Math.atan2(domePosition(0, 0)[2], x0));
  });

  it('keeps every day on the same sphere, above the horizon', () => {
    for (const [w, d] of [[0, 0], [25, 3], [51, 6]] as const) {
      const [x, y, z] = domePosition(w, d);
      expect(Math.hypot(x, y, z)).toBeCloseTo(domePosition(0, 0).reduce((s, v) => s + v * v, 0) ** 0.5);
      expect(y).toBeGreaterThan(0);
    }
  });
});
