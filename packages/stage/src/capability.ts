/**
 * Whether an immersive 3D moment may run (docs/DESIGN.md §6.2). The 2D version is always
 * complete; 3D is layered on top only when the device, the person and the settings all agree.
 */
export type ImmersiveReason = 'ok' | 'flat-pages' | 'reduced-motion' | 'no-webgl' | 'low-power' | 'patron';

export const IMMERSIVE_REASON_TEXT: Record<Exclude<ImmersiveReason, 'ok'>, string> = {
  'flat-pages': 'Flat pages is on in Settings.',
  'reduced-motion': 'Your device asks for reduced motion.',
  'no-webgl': 'This browser can’t draw 3D (no WebGL2).',
  'low-power': 'This device is saving power or memory.',
  patron: 'Immersive modes are part of ETERNALL Patron.',
};

let webgl2: boolean | null = null;
export function hasWebGL2(): boolean {
  if (webgl2 !== null) return webgl2;
  try {
    const canvas = document.createElement('canvas');
    webgl2 = !!canvas.getContext('webgl2');
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

export function detectImmersive(opts: { flatPages: boolean; licensed?: boolean }): { allowed: boolean; reason: ImmersiveReason } {
  if (opts.flatPages) return { allowed: false, reason: 'flat-pages' };
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return { allowed: false, reason: 'reduced-motion' };
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if ((nav.deviceMemory !== undefined && nav.deviceMemory < 4) || nav.connection?.saveData) return { allowed: false, reason: 'low-power' };
  if (!hasWebGL2()) return { allowed: false, reason: 'no-webgl' };
  if (opts.licensed === false) return { allowed: false, reason: 'patron' };
  return { allowed: true, reason: 'ok' };
}
