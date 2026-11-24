import { contrast, lookTokens, readLook, validateLookSpec, defaultLook } from '@eternall/core';
import { ROUTEEN_LOOKS } from './look';

describe('the sky’s look', () => {
  it('keeps every sky, accent and mode readable', () => {
    expect(validateLookSpec(ROUTEEN_LOOKS)).toEqual([]);
  });
  it('offers four skies and five accents, Fajar first', () => {
    expect(Object.keys(ROUTEEN_LOOKS.presets)).toEqual(['fajar', 'siang', 'senja', 'malam']);
    expect(Object.keys(ROUTEEN_LOOKS.accents)).toEqual(['amber', 'sky', 'dusk', 'leaf', 'stone']);
    expect(ROUTEEN_LOOKS.defaultPreset).toBe('fajar');
  });
  it('opens a loom-era look as its nearest sky, keeping the other choices', () => {
    const l = readLook(ROUTEEN_LOOKS, { id: 'look', preset: 'madder', accent: 'lichen', type: 'bookish', size: 's', density: 'compact' });
    expect(l).toMatchObject({ preset: 'senja', accent: 'leaf', type: 'bookish', size: 's', density: 'compact' });
  });
  it('maps every old preset and accent', () => {
    for (const [o, n] of Object.entries({ linen: 'fajar', indigo: 'siang', madder: 'senja', night: 'malam' })) expect(readLook(ROUTEEN_LOOKS, { preset: o }).preset).toBe(n);
    for (const [o, n] of Object.entries({ indigo: 'sky', madder: 'dusk', walnut: 'amber', lichen: 'leaf', iron: 'stone' })) expect(readLook(ROUTEEN_LOOKS, { accent: o }).accent).toBe(n);
  });
  it('gives the header a sky gradient in both modes, and no dyes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const t = lookTokens(ROUTEEN_LOOKS, defaultLook(ROUTEEN_LOOKS), mode);
      expect(t['--sky-top']).toBeTruthy();
      expect(t['--sky-bottom']).toBeTruthy();
    }
    for (const p of Object.values(ROUTEEN_LOOKS.presets)) for (const k of [...Object.keys(p.light), ...Object.keys(p.dark)]) expect(k).not.toMatch(/^--dye-/);
  });
  it('keeps the header’s words (--ink, --ink-2) readable on both ends of every sky, in both modes', () => {
    // The header's text sits on the gradient; --ink-3 and the accent are kept off it (routeen.css).
    const low: string[] = [];
    for (const [id, p] of Object.entries(ROUTEEN_LOOKS.presets))
      for (const mode of ['light', 'dark'] as const) {
        const t = p[mode];
        for (const ink of ['--ink', '--ink-2'])
          for (const end of ['--sky-top', '--sky-bottom']) {
            const ratio = contrast(t[ink]!, t[end]!);
            if (ratio < 4.5) low.push(`${id} ${mode} ${ink} on ${end}: ${ratio.toFixed(2)}`);
          }
      }
    expect(low).toEqual([]);
  });
  it('keeps every accent visible as a body on both ends of every sky, in both modes', () => {
    // Bodies in the sky are graphical objects: at least 3:1 against the sky behind them (WCAG 1.4.11).
    const low: string[] = [];
    for (const [id, p] of Object.entries(ROUTEEN_LOOKS.presets))
      for (const mode of ['light', 'dark'] as const)
        for (const [aid, a] of Object.entries(ROUTEEN_LOOKS.accents))
          for (const end of ['--sky-top', '--sky-bottom']) {
            const ratio = contrast(a[mode][0], p[mode][end]!);
            if (ratio < 3) low.push(`${id} ${mode} ${aid} on ${end}: ${ratio.toFixed(2)}`);
          }
    expect(low).toEqual([]);
  });
  it('keeps every dark sky clear, never a muddy grey', () => {
    // HSL saturation of both ends of each dark sky: a night sky with colour in it, not brown-grey.
    const sat = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    };
    const dull: string[] = [];
    for (const [id, p] of Object.entries(ROUTEEN_LOOKS.presets))
      for (const end of ['--sky-top', '--sky-bottom']) if (sat(p.dark[end]!) < 0.25) dull.push(`${id} ${end}: ${sat(p.dark[end]!).toFixed(2)}`);
    expect(dull).toEqual([]);
  });
});
