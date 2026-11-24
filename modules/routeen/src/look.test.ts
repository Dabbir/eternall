import { lookTokens, readLook, validateLookSpec, defaultLook } from '@eternall/core';
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
    for (const p of Object.values(ROUTEEN_LOOKS.presets)) for (const k of Object.keys(p.light)) expect(k).not.toMatch(/^--dye-/);
  });
});
