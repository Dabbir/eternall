import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { kindred } from '../index';

export type KindredPlace = 'file' | 'sky' | 'person';

const DRAWERS: { place: Exclude<KindredPlace, 'person'>; label: string; short: string; to: string }[] = [
  { place: 'file', label: 'Card file', short: 'Cards', to: '/' },
  { place: 'sky', label: 'Constellation', short: 'Sky', to: '/sky' },
];

/**
 * KINDRED's own frame (docs/design/kindred.md §Chrome; docs/adr/0011): a card cabinet seen from
 * the front. The brass label plate sits at the top of the page; **the navigation is the row of
 * drawer fronts along the bottom**, each with a label card and a brass pull. The open drawer stands
 * pulled out. The row also holds "Close the drawer" (back to the house), search, the key and the
 * primary action as a letterpress block, in the same place on every KINDRED screen, and within
 * reach of a thumb on a phone.
 */
export function Chrome({ here, children }: { here: KindredPlace; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  // A person's card is filed in the card file, so that drawer stays out while one is open.
  const open = here === 'person' ? 'file' : here;
  return (
    <div className="kc">
      <header className="kc-top">
        <a className="kc-plate" href={house.href('/')} onClick={go('/')}>
          <span className="kc-plate__screw" aria-hidden="true" />
          <span className="kc-plate__text">
            <span className="kc-plate__name">KINDRED</span>
            <span className="kc-plate__fn">{kindred.functionLine}</span>
          </span>
          <span className="kc-plate__screw" aria-hidden="true" />
        </a>
      </header>

      <IntroNote />
      <div className="kc-body">{children}</div>

      <nav className="kn" aria-label="KINDRED">
        <div className="kn-row">
          <button type="button" className="kn-front kn-front--exit" onClick={house.leave} aria-label={`${kindred.brand.leaveLabel}, back to your lifeline`}>
            <span className="kn-label">
              <span aria-hidden="true">←</span> <span className="kn-label__long">{kindred.brand.leaveLabel}</span>
            </span>
            {house.notices > 0 && <span className="kn-dot" aria-hidden="true" />}
          </button>

          <div className="kn-drawers">
            {DRAWERS.map((d) => (
              <a key={d.place} className="kn-front" href={house.href(d.to)} onClick={go(d.to)} aria-current={here === d.place ? 'page' : open === d.place ? 'true' : undefined}>
                <span className="kn-label">
                  <span className="kn-label__long">{d.label}</span>
                  <span className="kn-label__short">{d.short}</span>
                </span>
                <span className="kn-pull" aria-hidden="true" />
              </a>
            ))}
          </div>

          <div className="kn-tools">
            <button type="button" className="kn-tool" onClick={house.openSearch} aria-label="Search KINDRED" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
              <Icon name="search" size={18} />
            </button>
            {house.canLock && (
              <button type="button" className="kn-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
                <Icon name="lock" size={18} />
              </button>
            )}
            {primary && (
              <button type="button" className="kc-press" onClick={primary.run} aria-label={primary.label}>
                <span className="kc-press__plus" aria-hidden="true">
                  +
                </span>
                <span className="kc-press__long">{primary.label}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
