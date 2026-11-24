import type { ISODate } from '@eternall/core';
import { copy } from '../copy';
import { markId, tierOf, type Practice, type Tier } from '../practices';
import { TIER_GLYPH } from './glyphs';
import type { Routine } from './useRoutine';

const TIERS: readonly Tier[] = ['minimum', 'target', 'more'];

/** The amount a tier stands for, when the practice has a measure ("10 menit"). */
function amountHint(p: Practice, tier: Tier): string | null {
  const m = p.measure;
  if (!m) return null;
  if (tier === 'minimum') return copy.amount.exact(m.minimum, m.unit);
  if (tier === 'target') return copy.amount.exact(m.target, m.unit);
  return copy.amount.more(m.target, m.unit);
}

/**
 * A chip is one tap for one practice on one date: unmarked lights it (`onTap` decides the tier),
 * marked unmarks it. The other tiers sit right after it. Used on Today and on a day's page.
 */
export function Chip({ practice: p, date, routine: r, state, onTap }: { practice: Practice; date: ISODate; routine: Routine; state?: string; onTap(): void }) {
  const mark = r.idx.get(markId(p.id, date));
  const tier = mark ? tierOf(mark) : null;
  return (
    <span className={`rs-chip ${tier ? `is-lit rs-chip--${tier}` : ''}`} data-state={state}>
      <button type="button" className="rs-chip__main" aria-pressed={!!tier} onClick={onTap}>
        <span className="rs-chip__name">{p.name}</span>
        {tier && (
          <>
            {' '}
            <span className="rs-chip__glyph" aria-hidden="true">
              {TIER_GLYPH[tier]}
            </span>{' '}
            <span className="rs-chip__tier">{copy.tiers[tier]}</span>
          </>
        )}
      </button>
      {tier && (
        <span className="rs-tiers" role="group" aria-label={copy.aria.tierChoice}>
          {TIERS.filter((t) => t !== tier).map((t) => {
            const hint = amountHint(p, t);
            return (
              <button key={t} type="button" className={`rs-tier rs-tier--${t}`} onClick={() => r.setTier(p, date, t)}>
                <span aria-hidden="true">{TIER_GLYPH[t]}</span> {copy.tiers[t]}
                {hint && <span className="rs-tier__hint"> · {hint}</span>}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
