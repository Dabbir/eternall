/**
 * Personal looks for every app (docs/adr/0014; first built for AMAZEEN in ADR 0013). An app declares a
 * `LookSpec`: ready-made presets (light and dark paper/ink tokens), a few accents, type pairings from
 * fonts it already self-hosts, text sizes and densities. A person's `Look` picks one of each. A look
 * only sets design tokens — layout never moves, and light or dark still follows the house theme — and
 * every combination is checked for contrast by `validateLookSpec`. Looks are vault records, never
 * localStorage.
 */

export type LookMode = 'light' | 'dark';

export interface LookPreset {
  label: string;
  note: string;
  /** The accent this preset brings when the person hasn't chosen one. */
  accent: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

/** An accent per mode: [fill, small text on the paper, text on the fill]. */
export interface LookAccent {
  label: string;
  light: [string, string, string];
  dark: [string, string, string];
}

export interface LookType {
  label: string;
  note: string;
  tokens: Record<string, string>;
}

export interface LookSpec {
  /** The app's id, as on `<body data-imprint>`. */
  imprint: string;
  presets: Record<string, LookPreset>;
  defaultPreset: string;
  accents: Record<string, LookAccent>;
  /** Which tokens the accent's fill, text and on-fill colours set, e.g. ['--accent', '--accent', '--on-accent']. */
  accentTokens: [string, string, string];
  types: Record<string, LookType>;
  defaultType: string;
  sizes: Record<string, { label: string; scale: number }>;
  densities: Record<string, { label: string; space: number; leading: number }>;
  /** Preset token names checked for contrast: the backgrounds, the body ink and the secondary inks. */
  contrast: { backgrounds: string[]; body: string; secondary: string[] };
  /**
   * Old ids an app has renamed, mapped to their current ones: a stored look with an aliased preset or
   * accent opens as the target, keeping its other choices. Optional; apps without it behave as before.
   */
  aliases?: { presets?: Record<string, string>; accents?: Record<string, string> };
  /** Further tokens worked out from the chosen ones (e.g. rules from the ink, a soft accent). */
  derive?(tokens: Readonly<Record<string, string>>, mode: LookMode): Record<string, string>;
}

export interface Look {
  id: 'look';
  preset: string;
  /** Absent: the preset's own accent. */
  accent?: string;
  type: string;
  size: string;
  density: string;
}

export const defaultLook = (spec: LookSpec): Look => ({ id: 'look', preset: spec.defaultPreset, type: spec.defaultType, size: 'm', density: 'regular' });

const has = <K extends string>(rec: Record<K, unknown>, k: unknown): k is K => typeof k === 'string' && Object.prototype.hasOwnProperty.call(rec, k);

const alias = (map: Record<string, string> | undefined, v: unknown): unknown => (map && typeof v === 'string' && Object.prototype.hasOwnProperty.call(map, v) ? map[v] : v);

/** A stored look, read safely: anything unknown falls back to the default, never to a broken page. */
export function readLook(spec: LookSpec, raw: unknown): Look {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = defaultLook(spec);
  const preset = alias(spec.aliases?.presets, r.preset);
  const accent = alias(spec.aliases?.accents, r.accent);
  const look: Look = {
    id: 'look',
    preset: has(spec.presets, preset) ? preset : d.preset,
    type: has(spec.types, r.type) ? r.type : d.type,
    size: has(spec.sizes, r.size) ? r.size : d.size,
    density: has(spec.densities, r.density) ? r.density : d.density,
  };
  if (has(spec.accents, accent)) look.accent = accent;
  return look;
}

export const accentOf = (spec: LookSpec, look: Look): string => look.accent ?? spec.presets[look.preset]!.accent;

/** Choose a ready-made look: it brings its own accent, and keeps the person's type, size and density. */
export function withPreset(look: Look, preset: string): Look {
  return { id: 'look', preset, type: look.type, size: look.size, density: look.density };
}

export function isDefaultLook(spec: LookSpec, look: Look): boolean {
  const d = defaultLook(spec);
  return look.preset === d.preset && accentOf(spec, look) === spec.presets[d.preset]!.accent && look.type === d.type && look.size === d.size && look.density === d.density;
}

/** The design tokens a look sets for one mode. */
export function lookTokens(spec: LookSpec, look: Look, mode: LookMode): Record<string, string> {
  const preset = spec.presets[look.preset] ?? spec.presets[spec.defaultPreset]!;
  const accent = spec.accents[accentOf(spec, look)] ?? spec.accents[preset.accent]!;
  const [fill, text, onFill] = accent[mode];
  const [fillToken, textToken, onFillToken] = spec.accentTokens;
  const tokens: Record<string, string> = {
    ...preset[mode],
    [fillToken]: fill,
    [textToken]: text,
    [onFillToken]: onFill,
    ...(spec.types[look.type] ?? spec.types[spec.defaultType]!).tokens,
    '--look-scale': String(spec.sizes[look.size]?.scale ?? 1),
    '--look-space': String(spec.densities[look.density]?.space ?? 1),
    '--look-leading': String(spec.densities[look.density]?.leading ?? 1),
  };
  return { ...tokens, ...spec.derive?.(tokens, mode) };
}

/**
 * The stylesheet for a look, for both modes, with the same selectors an app's own tokens use plus
 * `[data-look]`, so it wins over them and light/dark still follows the house.
 */
export function lookCss(spec: LookSpec, look: Look): string {
  const block = (mode: LookMode) =>
    Object.entries(lookTokens(spec, look, mode))
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');
  const sel = `[data-imprint='${spec.imprint}'][data-look]`;
  return [
    `${sel} { ${block('light')} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) ${sel} { ${block('dark')} } }`,
    `:root[data-theme='dark'] ${sel} { ${block('dark')} }`,
  ].join('\n');
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/**
 * Every preset × accent × mode, checked: body ink ≥ 7:1 and secondary inks ≥ 4.5:1 on every
 * background, accent text ≥ 4.5:1 on every background, and the accent's own text ≥ 4.5:1 on its fill.
 * Returns the failures in plain words; an empty list means the spec is safe to offer.
 */
export function validateLookSpec(spec: LookSpec): string[] {
  const out: string[] = [];
  const hex = (v: string | undefined) => (v && /^#[0-9a-f]{6}$/iu.test(v) ? v : null);
  for (const [pid, preset] of Object.entries(spec.presets)) {
    for (const mode of ['light', 'dark'] as const) {
      const t = preset[mode];
      const bgs = spec.contrast.backgrounds.map((k) => [k, hex(t[k])] as const);
      for (const [bk, bg] of bgs) {
        if (!bg) {
          out.push(`${pid} ${mode}: ${bk} is not a #rrggbb colour`);
          continue;
        }
        const body = hex(t[spec.contrast.body]);
        if (!body || contrast(body, bg) < 7) out.push(`${pid} ${mode}: body ink on ${bk} below 7:1`);
        for (const k of spec.contrast.secondary) {
          const c = hex(t[k]);
          if (!c || contrast(c, bg) < 4.5) out.push(`${pid} ${mode}: ${k} on ${bk} below 4.5:1`);
        }
        for (const [aid, a] of Object.entries(spec.accents)) if (contrast(a[mode][1], bg) < 4.5) out.push(`${pid} ${mode}: ${aid} text on ${bk} below 4.5:1`);
      }
      for (const [aid, a] of Object.entries(spec.accents)) if (contrast(a[mode][0], a[mode][2]) < 4.5) out.push(`${aid} ${mode}: text on its fill below 4.5:1`);
    }
  }
  return out;
}

export const LOOK_SIZES = {
  s: { label: 'Small', scale: 0.92 },
  m: { label: 'Medium', scale: 1 },
  l: { label: 'Large', scale: 1.12 },
  xl: { label: 'Extra large', scale: 1.25 },
} as const;

export const LOOK_DENSITIES = {
  compact: { label: 'Compact', space: 0.7, leading: 0.94 },
  regular: { label: 'Regular', space: 1, leading: 1 },
  airy: { label: 'Airy', space: 1.35, leading: 1.08 },
} as const;
