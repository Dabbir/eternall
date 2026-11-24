import { validateLookSpec } from '@eternall/core';
import { CASHEEN_LOOKS } from './look';

const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

describe('your book’s look', () => {
  it('keeps every book, ink and mode readable, "over" in red included', () => {
    expect(validateLookSpec(CASHEEN_LOOKS)).toEqual([]);
  });

  it('never offers red as an accent: red means "over" only', () => {
    for (const [id, a] of Object.entries(CASHEEN_LOOKS.accents))
      for (const mode of ['light', 'dark'] as const) {
        const h = hue(a[mode][0]);
        expect(h === null || (h > 20 && h < 340), `${id} ${mode} is red`).toBe(true);
      }
  });
});
