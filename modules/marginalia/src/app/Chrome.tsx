import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { marginalia } from '../index';

export type MarginaliaPlace = 'catalogue' | 'underlines' | 'work';

const GUIDES: { place: Exclude<MarginaliaPlace, 'work'>; label: string; to: string }[] = [
  { place: 'catalogue', label: 'Catalogue', to: '/' },
  { place: 'underlines', label: 'Every underline', to: '/underlines' },
];

/**
 * MARGINALIA's own frame (docs/design/marginalia.md §Chrome; docs/adr/0011): a library catalogue
 * card. A typed call number and title on ruled stock with a red head rule and the rod hole,
 * guide cards for places, the primary action typed in brackets, and a pencilled way back.
 */
export function Chrome({ here, children }: { here: MarginaliaPlace; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  return (
    <div className="mc">
      <header className="mc-desk">
        <button type="button" className="mc-exit" onClick={house.leave} aria-label={`${marginalia.brand.leaveLabel}, back to your lifeline`}>
          <span aria-hidden="true">↶</span> {marginalia.brand.leaveLabel}
          {house.notices > 0 && <span className="mc-exit__dot" role="img" aria-label={`${house.notices} waiting elsewhere`} />}
        </button>

        <a className="mc-card" href={house.href('/')} onClick={go('/')}>
          <span className="mc-card__call" aria-hidden="true">
            028.8
            <br />
            MAR
          </span>
          <span className="mc-card__text">
            <span className="mc-card__name">{marginalia.name}</span>
            <span className="mc-card__fn">{marginalia.functionLine}.</span>
          </span>
          <span className="mc-card__hole" aria-hidden="true" />
        </a>

        <div className="mc-tools">
          <button type="button" className="mc-tool" onClick={house.openSearch} aria-label="Search MARGINALIA" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={18} />
          </button>
          {house.canLock && (
            <button type="button" className="mc-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={18} />
            </button>
          )}
          {primary && (
            <button type="button" className="mc-type" onClick={primary.run}>
              {primary.label}
            </button>
          )}
        </div>
      </header>

      <nav className="mc-guides" aria-label="MARGINALIA">
        {GUIDES.map((g) => (
          <a key={g.place} className="mc-guide" href={house.href(g.to)} onClick={go(g.to)} aria-current={here === g.place ? 'page' : undefined}>
            {g.label}
          </a>
        ))}
      </nav>

      <IntroNote />
      <div className="mc-body">{children}</div>
    </div>
  );
}
