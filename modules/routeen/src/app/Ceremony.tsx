import { copy } from '../copy';
import type { Tier } from '../practices';
import { TIER_GLYPH } from './glyphs';

/**
 * ROUTEEN's moment (spec §4.7): **Lit**. On marking, a small sun rises from the chip onto the day's
 * arc and settles. Played through `house.ceremony(…, 700)`: decorative, never awaited, never blocks
 * the next tap, and skipped under reduced motion.
 */
export function Lit({ name, tier }: { name: string; tier: Tier }) {
  return (
    <div className={`rs-lit rs-lit--${tier}`}>
      <span className="rs-lit__sun" aria-hidden="true">
        {TIER_GLYPH[tier]}
      </span>
      <p className="rs-lit__name">{copy.toast.marked(name)}</p>
    </div>
  );
}
