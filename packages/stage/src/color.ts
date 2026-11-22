/** Resolve theme tokens to solid sRGB so 3D scenes follow the active palette (light and dark). */
export type RGBA = [number, number, number, number];

export function resolveColor(el: Element, cssColor: string): RGBA {
  const probe = document.createElement('span');
  probe.style.color = cssColor;
  probe.style.display = 'none';
  el.appendChild(probe);
  const out = getComputedStyle(probe).color;
  probe.remove();
  const m = out.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1];
}

/** Flatten a translucent colour over a background, returning `rgb(r, g, b)` for three.js. */
export function flatten(over: RGBA, under: RGBA): string {
  const a = over[3];
  const ch = (i: 0 | 1 | 2) => Math.round(over[i] * a + under[i] * (1 - a));
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/** Read named custom properties from an element and return solid colours, flattened over `--paper`. */
export function themeColors<K extends string>(el: Element, names: readonly K[]): Record<K | 'paper', string> {
  const paper = resolveColor(el, 'var(--paper)');
  const out = { paper: flatten(paper, [255, 255, 255, 1]) } as Record<K | 'paper', string>;
  for (const n of names) out[n] = flatten(resolveColor(el, `var(--${n})`), paper);
  return out;
}
