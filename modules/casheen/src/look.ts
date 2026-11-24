import { LOOK_DENSITIES, LOOK_SIZES, type LookSpec } from '@eternall/core';

/**
 * Your book's look (docs/design/casheen.md §14; ADR 0014): four account books and the inks a clerk
 * would use. Red stays reserved for "over" and is never an accent; "over by …" is always written out.
 * Stored in the vault as `ledger/look` (id `look`).
 */
export const LOOK_PATH = 'ledger/look';

const CASLON = "'Libre Caslon Text', 'Baskerville', Georgia, serif";
const MONO = "'DM Mono', ui-monospace, 'SF Mono', Menlo, monospace";

const book = (paper: string, sunk: string, raised: string, ink: string, ink2: string, ink3: string, red: string, ruling: string, margin: string) => ({
  '--paper': paper,
  '--paper-sunk': sunk,
  '--paper-raised': raised,
  '--ink': ink,
  '--ink-2': ink2,
  '--ink-3': ink3,
  '--red': red,
  '--ruling': ruling,
  '--margin-red': margin,
});

export const CASHEEN_LOOKS: LookSpec = {
  imprint: 'casheen',
  presets: {
    green: {
      label: 'Green ledger',
      note: 'Pale green stock, blue ruling — as it came',
      accent: 'green',
      light: book('#eef1e4', '#e3e8d5', '#f6f8ef', '#1d241c', '#485243', '#5c6756', '#a3302a', 'rgb(64 105 170 / 0.28)', 'rgb(176 52 44 / 0.55)'),
      dark: book('#111611', '#0b0f0b', '#182018', '#e6ecdf', '#b4bfac', '#939e8b', '#f0857a', 'rgb(140 170 215 / 0.2)', 'rgb(240 133 122 / 0.45)'),
    },
    blue: {
      label: 'Blue ruling',
      note: 'A clerk’s blue-ruled cashbook',
      accent: 'blue',
      light: book('#edf1f5', '#e1e7ee', '#f6f8fb', '#19202c', '#434b5a', '#566071', '#a3302a', 'rgb(52 96 170 / 0.38)', 'rgb(176 52 44 / 0.5)'),
      dark: book('#0f131a', '#0a0d12', '#161b24', '#e3e9f2', '#b3bccb', '#929cad', '#f0857a', 'rgb(140 170 215 / 0.26)', 'rgb(240 133 122 / 0.42)'),
    },
    carbon: {
      label: 'Carbon copy',
      note: 'Grey duplicate-book paper, violet carbon',
      accent: 'violet',
      light: book('#ecebe9', '#e1dfdc', '#f5f4f2', '#1e1d22', '#47454e', '#5b5963', '#a3302a', 'rgb(98 80 160 / 0.3)', 'rgb(176 52 44 / 0.5)'),
      dark: book('#121116', '#0c0b0f', '#1a1920', '#e7e5ee', '#b9b6c4', '#9894a4', '#f0857a', 'rgb(170 155 230 / 0.22)', 'rgb(240 133 122 / 0.42)'),
    },
    night: {
      label: 'Night ledger',
      note: 'Warm lamplit pages, sepia ink',
      accent: 'sepia',
      light: book('#f1e9d9', '#e7ddc9', '#f8f2e6', '#241c12', '#4e4130', '#625340', '#9c2b22', 'rgb(120 90 50 / 0.3)', 'rgb(156 43 34 / 0.5)'),
      dark: book('#16120c', '#100d08', '#1e1810', '#efe3cc', '#cbb99a', '#aa9a7e', '#f0857a', 'rgb(216 178 122 / 0.2)', 'rgb(240 133 122 / 0.42)'),
    },
  },
  defaultPreset: 'green',
  accents: {
    green: { label: 'Bookkeeper green', light: ['#2f5d3a', '#2f5d3a', '#f6f8ef'], dark: ['#8fc79b', '#8fc79b', '#0e140f'] },
    blue: { label: 'Ledger blue', light: ['#2c4f86', '#2c4f86', '#ffffff'], dark: ['#9db8e8', '#9db8e8', '#0d1424'] },
    sepia: { label: 'Sepia', light: ['#6e4a1f', '#6e4a1f', '#ffffff'], dark: ['#d8b27a', '#d8b27a', '#1a1208'] },
    violet: { label: 'Carbon violet', light: ['#5a3f8f', '#5a3f8f', '#ffffff'], dark: ['#bba7ec', '#bba7ec', '#160d2a'] },
    slate: { label: 'Slate', light: ['#44505e', '#44505e', '#ffffff'], dark: ['#aab6c4', '#aab6c4', '#111820'] },
  },
  accentTokens: ['--accent', '--accent', '--on-accent'],
  types: {
    classic: { label: 'Caslon & figures', note: 'Caslon for words, DM Mono for every figure', tokens: { '--font-display': CASLON, '--font-ui': CASLON, '--font-mono': MONO } },
    clerk: { label: 'Clerk', note: 'DM Mono throughout, like a typed ledger', tokens: { '--font-display': MONO, '--font-ui': MONO, '--font-mono': MONO } },
  },
  defaultType: 'classic',
  sizes: LOOK_SIZES,
  densities: LOOK_DENSITIES,
  contrast: { backgrounds: ['--paper', '--paper-raised'], body: '--ink', secondary: ['--ink-2', '--ink-3', '--red'] },
  derive: (t) => ({
    '--accent-deep': `color-mix(in srgb, ${t['--accent']} 78%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${t['--accent']} 12%, transparent)`,
    '--rule': `color-mix(in srgb, ${t['--ink']} 12%, transparent)`,
    '--rule-strong': `color-mix(in srgb, ${t['--ink']} 30%, transparent)`,
  }),
};
