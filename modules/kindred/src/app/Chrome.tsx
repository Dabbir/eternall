import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { kindred } from '../index';

export type KindredPlace = 'file' | 'sky' | 'person';

const TABS: { place: Exclude<KindredPlace, 'person'>; label: string; to: string }[] = [
  { place: 'file', label: 'Card file', to: '/' },
  { place: 'sky', label: 'Constellation', to: '/sky' },
];

/**
 * KINDRED's own frame (docs/design/kindred.md §Chrome; docs/adr/0011): the face of a card cabinet.
 * A brass label plate with the name, index tabs for the two views, search, the key, the primary
 * action as a letterpress block, and a small "Close the drawer" exit back to the house.
 * Every control sits in the same place on every KINDRED screen.
 */
export function Chrome({ here, children }: { here: KindredPlace; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  return (
    <div className="kc">
      <header className="kc-cabinet">
        <button type="button" className="kc-exit" onClick={house.leave}>
          <span className="kc-exit__arrow" aria-hidden="true">
            ←
          </span>
          {kindred.brand.leaveLabel}
          {house.notices > 0 && <span className="kc-exit__dot" role="img" aria-label={`${house.notices} waiting elsewhere`} />}
        </button>

        <a className="kc-plate" href={house.href('/')} onClick={go('/')}>
          <span className="kc-plate__screw" aria-hidden="true" />
          <span className="kc-plate__text">
            <span className="kc-plate__name">KINDRED</span>
            <span className="kc-plate__fn">{kindred.functionLine}</span>
          </span>
          <span className="kc-plate__screw" aria-hidden="true" />
        </a>

        <div className="kc-tools">
          <button type="button" className="kc-tool" onClick={house.openSearch} aria-label="Search KINDRED" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={18} />
          </button>
          {house.canLock && (
            <button type="button" className="kc-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={18} />
            </button>
          )}
          {primary && (
            <button type="button" className="kc-press" onClick={primary.run}>
              {primary.label}
            </button>
          )}
        </div>
      </header>

      <nav className="kc-tabs" aria-label="KINDRED">
        {TABS.map((t) => (
          <a key={t.place} className="kc-tab" href={house.href(t.to)} onClick={go(t.to)} aria-current={here === t.place ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>

      <IntroNote />
      <div className="kc-body">{children}</div>
    </div>
  );
}
