import type { Mode } from '../modes';
import type { Tier } from '../practices';

/** Shapes carry the meaning (spec §4.5, global constraints); colour only supports them. */
export const TIER_GLYPH: Record<Tier, string> = { minimum: '◐', target: '☀︎', more: '✺' };
export const MODE_GLYPH: Record<Mode, string> = { normal: '☀︎', low: '☁︎', off: '✦' };
