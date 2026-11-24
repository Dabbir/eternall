import { LOOK_DENSITIES, LOOK_SIZES, type LookSpec } from '@eternall/core';

/**
 * Your cloth's look (docs/design/routeen.md §9; ADR 0014): four cloths for the loom, an accent thread,
 * two type pairings, text size and density. The threads' own dyes and weave patterns never change with
 * the look, so practices stay told apart without colour. Stored in the vault as `refrain/look`.
 */
export const LOOK_PATH = 'refrain/look';

const cloth = (paper: string, raised: string, ink: string, ink2: string, ink3: string) => ({ '--paper': paper, '--paper-raised': raised, '--ink': ink, '--ink-2': ink2, '--ink-3': ink3 });
const WORK = "'Work Sans', system-ui, sans-serif";

export const ROUTEEN_LOOKS: LookSpec = {
  imprint: 'routeen',
  presets: {
    linen: { label: 'Linen', note: 'Undyed linen, as it came', accent: 'indigo', light: cloth('#efe8da', '#f7f2e7', '#22201b', '#4a453b', '#5f584b'), dark: cloth('#15130f', '#1c1a15', '#ece5d6', '#c6bead', '#a39b8b') },
    indigo: { label: 'Indigo vat', note: 'Cloth dipped in blue', accent: 'indigo', light: cloth('#e7ebf1', '#f3f5f8', '#16202f', '#3b4658', '#525d70'), dark: cloth('#0f1420', '#151b29', '#e3e9f4', '#bac4d6', '#97a2b8') },
    madder: { label: 'Madder', note: 'Warm red-earth cloth', accent: 'madder', light: cloth('#f2e3dc', '#f9efea', '#2a1612', '#553a33', '#6b4f47'), dark: cloth('#1a0f0c', '#221512', '#f2e1da', '#cfb6ad', '#ae958c') },
    night: { label: 'Night loom', note: 'Lamplight on the warp', accent: 'walnut', light: cloth('#e9e1d0', '#f3ecdf', '#1f1b14', '#4a4236', '#5f5648'), dark: cloth('#100e0b', '#18150f', '#e8dfcc', '#c2b8a3', '#a09681') },
  },
  defaultPreset: 'linen',
  accents: {
    indigo: { label: 'Indigo', light: ['#2e4a7d', '#2e4a7d', '#ffffff'], dark: ['#9db4e3', '#a9bfea', '#0d1424'] },
    madder: { label: 'Madder', light: ['#9c3628', '#93311f', '#ffffff'], dark: ['#e98a76', '#ef9a88', '#220b06'] },
    walnut: { label: 'Walnut', light: ['#6b4a2e', '#634427', '#ffffff'], dark: ['#c49a74', '#cfa883', '#1e1209'] },
    lichen: { label: 'Lichen', light: ['#46612f', '#405a2a', '#ffffff'], dark: ['#9cc07f', '#a8ca8c', '#0f1a08'] },
    iron: { label: 'Iron', light: ['#4c5560', '#46505a', '#ffffff'], dark: ['#a9b3bd', '#b6bfc8', '#12161a'] },
  },
  accentTokens: ['--accent', '--accent-text', '--on-accent'],
  types: {
    hand: { label: 'Hand-loomed', note: 'Young Serif headings over Work Sans', tokens: { '--font-display': "'Young Serif', Georgia, serif", '--font-ui': WORK } },
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
