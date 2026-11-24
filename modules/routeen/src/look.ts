import { LOOK_DENSITIES, LOOK_SIZES, type LookSpec } from '@eternall/core';

/**
 * The sky's look (docs/design/routeen.md; spec §4.8): four skies for the day, an accent, two type pairings,
 * text size and density. Looks change tokens only, never layout, and the glyph shapes never change.
 * Stored in the vault as `refrain/look`; loom-era ids (linen, indigo, madder, night) open as their nearest sky.
 */
export const LOOK_PATH = 'refrain/look';

const sky = (paper: string, raised: string, ink: string, ink2: string, ink3: string, top: string, bottom: string) => ({ '--paper': paper, '--paper-raised': raised, '--ink': ink, '--ink-2': ink2, '--ink-3': ink3, '--sky-top': top, '--sky-bottom': bottom });
const WORK = "'Work Sans', system-ui, sans-serif";

export const ROUTEEN_LOOKS: LookSpec = {
  imprint: 'routeen',
  presets: {
    fajar: { label: 'Fajar', note: 'Dawn, peach to pale blue', accent: 'amber', light: sky('#f8efe8', '#fdf8f3', '#27201f', '#4d4240', '#605452', '#f7d9c6', '#d6e6f3'), dark: sky('#1a1618', '#221d20', '#f1e6e0', '#cfc1ba', '#ada09a', '#4a3a3c', '#2b3a4d') },
    siang: { label: 'Siang', note: 'Midday, clear blue and bright paper', accent: 'sky', light: sky('#eef4fa', '#f8fbfe', '#142030', '#38485c', '#4d5d71', '#bcd8f2', '#e6f1fa'), dark: sky('#0f1722', '#16202e', '#e4edf8', '#b9c8da', '#95a7bd', '#1f3a5c', '#16283d') },
    senja: { label: 'Senja', note: 'Dusk, amber into violet', accent: 'dusk', light: sky('#f7eee6', '#fcf6ef', '#2a1d22', '#52404a', '#65535d', '#f5c98a', '#cdbde3'), dark: sky('#181220', '#211a2b', '#f0e5ea', '#cfbfca', '#ac9ca9', '#5a3a3a', '#3a2c57') },
    malam: { label: 'Malam', note: 'Night, deep blue paper and warm ink', accent: 'amber', light: sky('#e6e9f1', '#f1f3f8', '#1b1d2a', '#40445a', '#555a70', '#b9c0d9', '#d4d7e8'), dark: sky('#0c1220', '#131a2c', '#f0e4cf', '#cbbfa8', '#a89e89', '#16213b', '#0c1220') },
  },
  defaultPreset: 'fajar',
  accents: {
    amber: { label: 'Amber', light: ['#9a5a14', '#8f5210', '#ffffff'], dark: ['#f0b968', '#f4c47e', '#1e1204'] },
    sky: { label: 'Sky', light: ['#2a5a94', '#254f84', '#ffffff'], dark: ['#9cc4f2', '#a9cdf5', '#08121f'] },
    dusk: { label: 'Dusk', light: ['#6a4a94', '#5f4287', '#ffffff'], dark: ['#c4a8ee', '#cdb5f1', '#150c22'] },
    leaf: { label: 'Leaf', light: ['#46612f', '#405a2a', '#ffffff'], dark: ['#9cc07f', '#a8ca8c', '#0f1a08'] },
    stone: { label: 'Stone', light: ['#4c5560', '#46505a', '#ffffff'], dark: ['#a9b3bd', '#b6bfc8', '#12161a'] },
  },
  aliases: {
    presets: { linen: 'fajar', indigo: 'siang', madder: 'senja', night: 'malam' },
    accents: { indigo: 'sky', madder: 'dusk', walnut: 'amber', lichen: 'leaf', iron: 'stone' },
  },
  accentTokens: ['--accent', '--accent-text', '--on-accent'],
  types: {
    hand: { label: 'Hand-drawn', note: 'Young Serif headings over Work Sans', tokens: { '--font-display': "'Young Serif', Georgia, serif", '--font-ui': WORK } },
    bookish: { label: 'Bookish', note: 'Literata headings over Work Sans', tokens: { '--font-display': "'Literata', Georgia, serif", '--font-ui': WORK } },
  },
  defaultType: 'hand',
  sizes: LOOK_SIZES,
  densities: LOOK_DENSITIES,
  contrast: { backgrounds: ['--paper', '--paper-raised'], body: '--ink', secondary: ['--ink-2', '--ink-3'] },
  derive: (t, mode) => ({
    '--paper-sunk': `color-mix(in srgb, ${t['--paper']} 90%, ${mode === 'dark' ? '#000' : t['--ink']})`,
    '--accent-deep': `color-mix(in srgb, ${t['--accent']} 80%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${t['--accent']} 13%, transparent)`,
    '--rule': `color-mix(in srgb, ${t['--ink']} 13%, transparent)`,
    '--rule-strong': `color-mix(in srgb, ${t['--ink']} 31%, transparent)`,
    '--warp': `color-mix(in srgb, ${t['--ink']} 22%, transparent)`,
  }),
};
