import { LOOK_DENSITIES, LOOK_SIZES, contrast, defaultLook, isDefaultLook, lookCss, lookTokens, readLook, validateLookSpec, withPreset, type LookSpec } from './look';

const spec: LookSpec = {
  imprint: 'demo',
  presets: {
    day: { label: 'Day', note: '', accent: 'blue', light: { '--paper': '#ffffff', '--ink': '#111111', '--ink-2': '#555555' }, dark: { '--paper': '#111111', '--ink': '#eeeeee', '--ink-2': '#aaaaaa' } },
    sepia: { label: 'Sepia', note: '', accent: 'brown', light: { '--paper': '#f3ead8', '--ink': '#201810', '--ink-2': '#4d4030' }, dark: { '--paper': '#16110a', '--ink': '#efe2c8', '--ink-2': '#c8b796' } },
  },
  defaultPreset: 'day',
  accents: {
    blue: { label: 'Blue', light: ['#1f4fb0', '#1f4fb0', '#ffffff'], dark: ['#9db8ff', '#9db8ff', '#0b1430'] },
    brown: { label: 'Brown', light: ['#6b4a2e', '#6b4a2e', '#ffffff'], dark: ['#d8b27a', '#d8b27a', '#1a1208'] },
  },
  accentTokens: ['--accent', '--accent', '--on-accent'],
  types: { plain: { label: 'Plain', note: '', tokens: { '--font-ui': 'Work Sans' } }, serif: { label: 'Serif', note: '', tokens: { '--font-ui': 'Literata' } } },
  defaultType: 'plain',
  sizes: LOOK_SIZES,
  densities: LOOK_DENSITIES,
  contrast: { backgrounds: ['--paper'], body: '--ink', secondary: ['--ink-2'] },
  derive: (t) => ({ '--accent-soft': `${t['--accent']}22` }),
};

describe('looks', () => {
  it('measures contrast the WCAG way', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('reads a stored look safely, falling back for anything unknown', () => {
    expect(readLook(spec, undefined)).toEqual(defaultLook(spec));
    expect(readLook(spec, { preset: 'sepia', accent: 'blue', type: 'serif', size: 'xl', density: 'airy' })).toEqual({ id: 'look', preset: 'sepia', accent: 'blue', type: 'serif', size: 'xl', density: 'airy' });
    expect(readLook(spec, { preset: 'neon', accent: '#f00', size: 99 })).toEqual(defaultLook(spec));
  });

  it('takes a preset with its own accent, keeping type, size and density', () => {
    expect(withPreset({ ...defaultLook(spec), accent: 'blue', size: 'l' }, 'sepia')).toEqual({ id: 'look', preset: 'sepia', type: 'plain', size: 'l', density: 'regular' });
  });

  it('knows the default look, whatever the preset accent is called', () => {
    expect(isDefaultLook(spec, defaultLook(spec))).toBe(true);
    expect(isDefaultLook(spec, { ...defaultLook(spec), accent: 'blue' })).toBe(true);
    expect(isDefaultLook(spec, { ...defaultLook(spec), size: 'l' })).toBe(false);
  });

  it('turns a look into tokens: preset, accent, type, multipliers and derived tokens', () => {
    const t = lookTokens(spec, { ...defaultLook(spec), preset: 'sepia', type: 'serif', size: 'xl', density: 'compact' }, 'dark');
    expect(t['--paper']).toBe('#16110a');
    expect(t['--accent']).toBe('#d8b27a');
    expect(t['--font-ui']).toBe('Literata');
    expect([t['--look-scale'], t['--look-space'], t['--look-leading']]).toEqual(['1.25', '0.7', '0.94']);
    expect(t['--accent-soft']).toBe('#d8b27a22');
  });

  it('writes one stylesheet for light and dark that follows the house theme', () => {
    const css = lookCss(spec, defaultLook(spec));
    expect(css).toContain("[data-imprint='demo'][data-look] { --paper: #ffffff;");
    expect(css).toContain(":root[data-theme='dark'] [data-imprint='demo'][data-look] { --paper: #111111;");
    expect(css).toContain("@media (prefers-color-scheme: dark) { :root:not([data-theme='light'])");
  });

  it('validates every preset × accent × mode, in plain words', () => {
    expect(validateLookSpec(spec)).toEqual([]);
    const bad: LookSpec = { ...spec, accents: { ...spec.accents, pale: { label: 'Pale', light: ['#eeeeee', '#dddddd', '#ffffff'], dark: ['#222222', '#333333', '#111111'] } } };
    expect(validateLookSpec(bad)).toContain('day light: pale text on --paper below 4.5:1');
    expect(validateLookSpec(bad)).toContain('pale light: text on its fill below 4.5:1');
  });
});
