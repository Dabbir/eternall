import { useId } from 'react';
import type { ISODate } from '@eternall/core';
import { copy } from '../copy';
import { markId, tierOf, type Practice, type Tier } from '../practices';
import { BodyIcon } from './Body';
import type { Routine } from './useRoutine';

const TIERS: readonly Tier[] = ['minimum', 'target', 'more'];

/** The amount a tier stands for, when the practice has a measure ("10 minutes"). */
export function amountHint(p: Practice, tier: Tier): string | null {
  const m = p.measure;
  if (!m) return null;
  if (tier === 'minimum') return copy.amount.exact(m.minimum, m.unit);
  if (tier === 'target') return copy.amount.exact(m.target, m.unit);
  return copy.amount.more(m.target, m.unit);
}

/**
 * One practice on one date, as a row that never changes its shape (ADR 0016): the main button lights it
 * at the mode's tier (`onTap`) or unlights it; the three tiers (◐ ☀︎ ✺) are always there, so a tap
 * never makes anything appear, vanish or move, and "a little" is one tap. Tapping the lit tier unlights.
 * `note` says in words how the practice stood that day (a day's page); it describes the main button.
 */
export function PracticeRow({ practice: p, date, routine: r, state, note, onTap, onTier }: { practice: Practice; date: ISODate; routine: Routine; state?: string; note?: string; onTap(): void; onTier(t: Tier): void }) {
  const noteId = useId();
  const mark = r.idx.get(markId(p.id, date));
  const tier = mark ? tierOf(mark) : null;
  // A day's page says the state in words (`note`), so the tier is not said twice.
  const sub = tier ? (note ? null : copy.tiers[tier]) : amountHint(p, 'target');
  return (
    <div className={`rs-row${tier ? ` is-lit rs-row--${tier}` : ''}`} data-practice={p.id} data-state={state}>
      <button type="button" className="rs-row__main" aria-pressed={!!tier} aria-describedby={note ? noteId : undefined} onClick={onTap}>
        <BodyIcon kind={tier ?? 'unlit'} className="rs-row__body" />
        <span className="rs-row__text">
          <span className="rs-row__name">{p.name}</span>
          {sub && <span className="rs-row__sub"> {sub}</span>}
        </span>
      </button>
      <span className="rs-row__tiers" role="group" aria-label={copy.aria.tierChoice}>
        {TIERS.map((t) => (
          <button key={t} type="button" className={`rs-tier rs-tier--${t}`} aria-pressed={tier === t} aria-label={copy.aria.tierFor(t, p.name, amountHint(p, t))} title={copy.tiers[t]} onClick={() => onTier(t)}>
            <BodyIcon kind={t} />
          </button>
        ))}
      </span>
      {note && (
        <span id={noteId} className="rs-row__note">
          {note}
        </span>
      )}
    </div>
  );
}
