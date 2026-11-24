import { LOOK_DENSITIES, LOOK_SIZES, contrast, isDefaultLook as coreIsDefault, lookCss as coreCss, lookTokens as coreTokens, readLook as coreReadLook, withPreset as coreWithPreset, type LookSpec } from '@eternall/core';

/**
 * Your edition's look (docs/design/amazeen.md §13; docs/PRODUCT.md): a few ready-made looks and a
 * small, bounded set of choices — accent, typeface, text size and density — so every combination stays
 * readable (validated in look.test.ts) and only self-hosted fonts are used. A look only changes tokens:
 * layout never moves, and light or dark still follows the house theme. Stored in the vault
 * (`amazeen/prefs`, id `look`), never in localStorage.
 */

export const LOOK_PATH = 'amazeen/prefs';

export type PresetId = 'press' | 'riso' | 'broadsheet' | 'night';
export type AccentId = 'vermilion' | 'blue' | 'teal' | 'violet' | 'green' | 'ochre';
export type TypeId = 'classic' | 'book' | 'typewriter';
export type SizeId = 's' | 'm' | 'l' | 'xl';
export type DensityId = 'compact' | 'regular' | 'airy';
export type Mode = 'light' | 'dark';

export interface Look {
  id: 'look';
  preset: PresetId;
  /** Absent: the preset's own accent. */
  accent?: AccentId;
  type: TypeId;
  size: SizeId;
  density: DensityId;
}

export const DEFAULT_LOOK: Look = { id: 'look', preset: 'press', type: 'classic', size: 'm', density: 'regular' };

interface Paper {
  paper: string;
  paper2: string;
  paper3: string;
  sheet: string;
  ink: string;
  ink2: string;
  ink3: string;
}

export const PRESETS: Record<PresetId, { label: string; note: string; accent: AccentId; light: Paper; dark: Paper }> = {
  press: {
    label: 'Press',
    note: 'Newsprint and vermilion, as it came',
    accent: 'vermilion',
    light: { paper: '#efe9dd', paper2: '#e5dccb', paper3: '#d8cdb8', sheet: '#f8f4ec', ink: '#15130f', ink2: '#46403a', ink3: '#655d52' },
    dark: { paper: '#12100d', paper2: '#1c1915', paper3: '#2a261f', sheet: '#1a1713', ink: '#ece4d4', ink2: '#c3baa9', ink3: '#a29a8c' },
  },
  riso: {
    label: 'Riso',
    note: 'Pink stock, blue ink, a zine',
    accent: 'blue',
    light: { paper: '#f6eef0', paper2: '#ecdfe3', paper3: '#dccbd1', sheet: '#fcf7f8', ink: '#1b1530', ink2: '#463e5c', ink3: '#5f5775' },
    dark: { paper: '#14111c', paper2: '#1d1927', paper3: '#2b2638', sheet: '#1a1624', ink: '#ece6f6', ink2: '#c4bcd6', ink3: '#a59cb8' },
  },
  broadsheet: {
    label: 'Broadsheet',
    note: 'Cool grey newsprint, a green rule',
    accent: 'green',
    light: { paper: '#f1f1ed', paper2: '#e6e6e0', paper3: '#d6d6ce', sheet: '#fafaf7', ink: '#111111', ink2: '#3d3d3a', ink3: '#5a5a55' },
    dark: { paper: '#101111', paper2: '#191a1a', paper3: '#262727', sheet: '#161717', ink: '#ebebe6', ink2: '#c0c0ba', ink3: '#9d9d97' },
  },
  night: {
    label: 'Night desk',
    note: 'Lamplight on sepia, warm after dark',
    accent: 'ochre',
    light: { paper: '#ecdfc8', paper2: '#e2d2b6', paper3: '#d3c09f', sheet: '#f5ecdc', ink: '#23180c', ink2: '#4f3f2c', ink3: '#665339' },
    dark: { paper: '#17110b', paper2: '#211910', paper3: '#30251a', sheet: '#1d160e', ink: '#f0e2c8', ink2: '#cdbb9c', ink3: '#ac9a7c' },
  },
};

/** [fill, small text, text on the fill] per mode. */
export const ACCENTS: Record<AccentId, { label: string; light: [string, string, string]; dark: [string, string, string] }> = {
  vermilion: { label: 'Vermilion', light: ['#cc3720', '#b02c18', '#fff8ef'], dark: ['#ff5a42', '#ff6b55', '#1b0c08'] },
  blue: { label: 'Riso blue', light: ['#2747c9', '#2747c9', '#ffffff'], dark: ['#8ea4ff', '#9fb2ff', '#0b1030'] },
  teal: { label: 'Teal', light: ['#006d75', '#006870', '#ffffff'], dark: ['#3fc3cc', '#5fd0d8', '#04191b'] },
  violet: { label: 'Violet', light: ['#6a44b5', '#5f3ca6', '#ffffff'], dark: ['#b9a0ff', '#c4afff', '#160b2b'] },
  green: { label: 'Green', light: ['#1d7a4c', '#176b42', '#ffffff'], dark: ['#5fd39a', '#72dca8', '#06160e'] },
  ochre: { label: 'Ochre', light: ['#875200', '#7a4a00', '#ffffff'], dark: ['#f0b040', '#f4be5c', '#1d1200'] },
};

const DISPLAY = "'Fraunces Variable', 'Fraunces', Georgia, serif";
const TEXT = "'Newsreader Variable', 'Newsreader', Georgia, serif";
const MONO = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

export const TYPES: Record<TypeId, { label: string; note: string; display: string; text: string }> = {
  classic: { label: 'Classic', note: 'Fraunces headlines, Newsreader copy', display: DISPLAY, text: TEXT },
  book: { label: 'Book', note: 'Newsreader throughout, quiet and literary', display: TEXT, text: TEXT },
  typewriter: { label: 'Typewriter', note: 'Mono headlines over Newsreader copy', display: MONO, text: TEXT },
};

export const SIZES: Record<SizeId, { label: string; scale: number }> = LOOK_SIZES;

export const DENSITIES: Record<DensityId, { label: string; space: number; leading: number }> = LOOK_DENSITIES;

const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  return `rgb(${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)} / ${a})`;
};
const paperTokens = (p: Paper): Record<string, string> => ({ '--paper': p.paper, '--paper-2': p.paper2, '--paper-3': p.paper3, '--sheet': p.sheet, '--ink': p.ink, '--ink-2': p.ink2, '--ink-3': p.ink3 });

/** AMAZEEN's looks on the shared engine (packages/core/src/look.ts, docs/adr/0014). */
export const AMAZEEN_LOOKS: LookSpec = {
  imprint: 'amazeen',
  presets: Object.fromEntries(Object.entries(PRESETS).map(([id, p]) => [id, { label: p.label, note: p.note, accent: p.accent, light: paperTokens(p.light), dark: paperTokens(p.dark) }])),
  defaultPreset: 'press',
  accents: ACCENTS,
  accentTokens: ['--press', '--press-text', '--press-ink'],
  types: Object.fromEntries(Object.entries(TYPES).map(([id, t]) => [id, { label: t.label, note: t.note, tokens: { '--font-display': t.display, '--font-text': t.text } }])),
  defaultType: 'classic',
  sizes: SIZES,
  densities: DENSITIES,
  contrast: { backgrounds: ['--paper', '--sheet'], body: '--ink', secondary: ['--ink-2', '--ink-3'] },
  derive: (t, mode) => ({
    '--rule': rgba(t['--ink']!, mode === 'dark' ? 0.85 : 0.92),
    '--hairline': rgba(t['--ink']!, mode === 'dark' ? 0.14 : 0.16),
    '--press-soft': rgba(t['--press']!, mode === 'dark' ? 0.14 : 0.1),
  }),
};

/** A stored look, read safely: anything unknown falls back to the default, never to a broken page. */
export const readLook = (raw: unknown): Look => coreReadLook(AMAZEEN_LOOKS, raw) as Look;
export const isDefaultLook = (look: Look): boolean => coreIsDefault(AMAZEEN_LOOKS, look);
/** The design tokens a look sets for one mode. */
export const lookTokens = (look: Look, mode: Mode): Record<string, string> => coreTokens(AMAZEEN_LOOKS, look, mode);
/** The stylesheet for a look, for both modes, following the house's light and dark. */
export const lookCss = (look: Look): string => coreCss(AMAZEEN_LOOKS, look);
/** Choose a ready-made look: it brings its own accent, and keeps the person's type, size and density. */
export const withPreset = (look: Look, preset: PresetId): Look => coreWithPreset(look, preset) as Look;
export { contrast };
