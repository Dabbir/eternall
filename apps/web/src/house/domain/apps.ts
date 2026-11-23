import type { ImprintId } from '@eternall/core';
import type { HouseSettings } from './house';

/**
 * Which apps are on (docs/adr/0013, docs/PRODUCT.md). AMAZEEN is the way in and is always on;
 * CASHEEN sits beside it. The others are built but switched on by the person in Settings → Apps.
 */
export const ALWAYS_ON: ImprintId = 'amazeen';
export const DEFAULT_APPS: readonly ImprintId[] = ['amazeen', 'casheen'];

const uniq = <T,>(xs: readonly T[]) => [...new Set(xs)];

/**
 * The apps that are on. Once the person has chosen (`settings.apps`), that choice. Until then it is
 * derived, never written, so a brand-new vault stays empty: the defaults plus every app that already
 * holds data (an existing vault loses nothing), minus apps hidden under the old `hidden` list.
 */
export function appsOn(settings: Pick<HouseSettings, 'apps' | 'hidden'>, withData: readonly string[]): string[] {
  if (settings.apps) return uniq([ALWAYS_ON, ...settings.apps]);
  return uniq([...DEFAULT_APPS, ...withData]).filter((id) => id === ALWAYS_ON || !settings.hidden.includes(id));
}

/** The settings patch for turning one app on or off. It records the whole choice and retires `hidden`. */
export function withApp(on: readonly string[], id: string, enabled: boolean): Pick<HouseSettings, 'apps' | 'hidden'> {
  if (id === ALWAYS_ON) return { apps: uniq([ALWAYS_ON, ...on]) as ImprintId[], hidden: [] };
  const next = enabled ? uniq([...on, id]) : on.filter((x) => x !== id);
  return { apps: uniq([ALWAYS_ON, ...next]) as ImprintId[], hidden: [] };
}
