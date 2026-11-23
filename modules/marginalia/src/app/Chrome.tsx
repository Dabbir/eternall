import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { marginalia } from '../index';

export type MarginaliaPlace = 'catalogue' | 'underlines' | 'work';

const NOTES: { place: Exclude<MarginaliaPlace, 'work'>; label: string; to: string }[] = [
  { place: 'catalogue', label: 'Catalogue', to: '/' },
  { place: 'underlines', label: 'Every underline', to: '/underlines' },
];

/**
 * MARGINALIA's own frame (docs/design/marginalia.md §Chrome; docs/adr/0011): **the navigation is
 * pencilled in the page's wide margin.** A ribbon bookmark hangs from the top edge ("Back to the
 * stacks"), the catalogue card names the app, the places are written in pencil with the current one
 * ringed, the primary action is typed in brackets, and "find" and "lock" are pencilled at the foot.
 * On a narrow page the margin folds into a pencilled line across the top.
 */
export function Chrome({ here, children }: { here: MarginaliaPlace; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  // A work's page is a card from the catalogue, so Catalogue stays ringed while one is open.
  return (
    <div className="mc">
      <nav className="mm" aria-label="MARGINALIA">
        <button type="button" className="mm-ribbon" onClick={house.leave} aria-label={`${marginalia.brand.leaveLabel}, back to your lifeline`}>
          <span className="mm-ribbon__tail" aria-hidden="true" />
          <span className="mm-ribbon__text">{marginalia.brand.leaveLabel}</span>
          {house.notices > 0 && <span className="mm-dot" aria-hidden="true" />}
        </button>

        <a className="mc-card" href={house.href('/')} onClick={go('/')}>
          <span className="mc-card__call" aria-hidden="true">
            028.8 MAR
          </span>
          <span className="mc-card__name">{marginalia.name}</span>
          <span className="mc-card__fn">{marginalia.functionLine}.</span>
          <span className="mc-card__hole" aria-hidden="true" />
        </a>

        <ul className="mm-notes">
          {NOTES.map((n) => (
            <li key={n.place}>
              <a className="mm-note" href={house.href(n.to)} onClick={go(n.to)} aria-current={here === n.place ? 'page' : here === 'work' && n.place === 'catalogue' ? 'true' : undefined}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>

        {primary && (
          <button type="button" className="mc-type" onClick={primary.run}>
            {primary.label}
          </button>
        )}

        <div className="mm-tools">
          <button type="button" className="mm-tool" onClick={house.openSearch} aria-label="Search MARGINALIA" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={16} />
            <span className="mm-tool__word" aria-hidden="true">
              find
            </span>
          </button>
          {house.canLock && (
            <button type="button" className="mm-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={16} />
              <span className="mm-tool__word" aria-hidden="true">
                lock
              </span>
            </button>
          )}
        </div>
      </nav>

      <div className="mc-page">
        <IntroNote />
        <div className="mc-body">{children}</div>
      </div>
    </div>
  );
}
