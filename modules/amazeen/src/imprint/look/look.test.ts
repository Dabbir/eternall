import { ACCENTS, DEFAULT_LOOK, PRESETS, contrast, isDefaultLook, lookCss, lookTokens, readLook, withPreset, type AccentId, type Mode, type PresetId } from './look';

const presets = Object.keys(PRESETS) as PresetId[];
const accents = Object.keys(ACCENTS) as AccentId[];
const modes: Mode[] = ['light', 'dark'];

describe('your edition’s look', () => {
  it('measures contrast the WCAG way', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('keeps every preset readable in both modes (body ≥ 7:1, secondary ≥ 4.5:1)', () => {
    for (const id of presets)
      for (const mode of modes) {
        const p = PRESETS[id][mode];
        for (const bg of [p.paper, p.sheet]) {
          expect(contrast(p.ink, bg), `${id} ${mode} ink`).toBeGreaterThanOrEqual(7);
          expect(contrast(p.ink2, bg), `${id} ${mode} ink-2`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p.ink3, bg), `${id} ${mode} ink-3`).toBeGreaterThanOrEqual(4.5);
        }
      }
  });

  it('keeps every accent readable on every preset, as text and as a button', () => {
    for (const id of presets)
      for (const accent of accents)
        for (const mode of modes) {
          const p = PRESETS[id][mode];
          const [fill, text, onFill] = ACCENTS[accent][mode];
          expect(contrast(text, p.paper), `${id} ${accent} ${mode} text`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(text, p.sheet), `${id} ${accent} ${mode} text on sheet`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(fill, onFill), `${id} ${accent} ${mode} button`).toBeGreaterThanOrEqual(4.5);
        }
  });

  it('reads a stored look safely, falling back for anything unknown', () => {
    expect(readLook(undefined)).toEqual(DEFAULT_LOOK);
    expect(readLook({ preset: 'riso', accent: 'teal', type: 'book', size: 'xl', density: 'airy' })).toEqual({ id: 'look', preset: 'riso', accent: 'teal', type: 'book', size: 'xl', density: 'airy' });
    expect(readLook({ preset: 'neon', accent: '#f00', size: 99, type: 'comic' })).toEqual(DEFAULT_LOOK);
  });

  it('takes a ready-made look with its own accent, keeping type, size and density', () => {
    expect(withPreset({ ...DEFAULT_LOOK, accent: 'teal', size: 'l' }, 'night')).toEqual({ id: 'look', preset: 'night', type: 'classic', size: 'l', density: 'regular' });
  });

  it('knows the default look, whatever the preset’s own accent is called', () => {
    expect(isDefaultLook(DEFAULT_LOOK)).toBe(true);
    expect(isDefaultLook({ ...DEFAULT_LOOK, accent: 'vermilion' })).toBe(true);
    expect(isDefaultLook({ ...DEFAULT_LOOK, size: 'l' })).toBe(false);
  });

  it('turns a look into tokens: the preset’s accent unless one is chosen, size and density as multipliers', () => {
    const riso = lookTokens({ ...DEFAULT_LOOK, preset: 'riso' }, 'light');
    expect(riso['--press']).toBe(ACCENTS.blue.light[0]);
    const chosen = lookTokens({ ...DEFAULT_LOOK, preset: 'riso', accent: 'green', size: 'xl', density: 'compact', type: 'typewriter' }, 'dark');
    expect(chosen['--press']).toBe(ACCENTS.green.dark[0]);
    expect(chosen['--look-scale']).toBe('1.25');
    expect(chosen['--look-space']).toBe('0.7');
    expect(chosen['--font-display']).toMatch(/JetBrains Mono/);
  });

  it('writes one stylesheet for light and dark that follows the house theme', () => {
    const css = lookCss({ ...DEFAULT_LOOK, preset: 'broadsheet' });
    expect(css).toContain("[data-imprint='amazeen'][data-look] { --paper: #f1f1ed;");
    expect(css).toContain(":root[data-theme='dark'] [data-imprint='amazeen'][data-look] { --paper: #101111;");
    expect(css).toContain("@media (prefers-color-scheme: dark) { :root:not([data-theme='light'])");
  });
});
