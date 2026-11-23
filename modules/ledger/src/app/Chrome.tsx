import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { ledger } from '../index';

export type LedgerPlace = 'month' | 'budget' | 'import';

/**
 * LEDGER's own frame (docs/design/ledger.md §Chrome; ADR 0011/0012): the head of a ledger page.
 * A bound book's spine edge with "Close the book", the title written across the ruled head,
 * the folio (place) in the corner, and the action that matters most here: writing a line.
 */
export function Chrome({ here, month, children }: { here: LedgerPlace; month: string; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  const places: { place: LedgerPlace; label: string; to: string }[] = [
    { place: 'month', label: 'The month', to: `/${month}` },
    { place: 'budget', label: 'Budget', to: `/budget/${month}` },
  ];
  return (
    <div className="lc">
      <header className="lc-head">
        <button type="button" className="lc-close" onClick={house.leave} aria-label={`${ledger.brand.leaveLabel}, back to your lifeline`}>
          <span className="lc-close__clasp" aria-hidden="true" />
          <span className="lc-close__text">{ledger.brand.leaveLabel}</span>
          {house.notices > 0 && <span className="lc-close__dot" role="img" aria-label={`${house.notices} waiting elsewhere`} />}
        </button>

        <a className="lc-title" href={house.href('/')} onClick={go('/')}>
          <span className="lc-title__name">{ledger.name}</span>
          <span className="lc-title__fn">{ledger.functionLine}</span>
        </a>

        <div className="lc-tools">
          <button type="button" className="lc-tool" onClick={house.openSearch} aria-label="Search LEDGER" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={18} />
          </button>
          {house.canLock && (
            <button type="button" className="lc-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={18} />
            </button>
          )}
          {primary && (
            <button type="button" className="lc-write" onClick={primary.run}>
              {primary.label}
            </button>
          )}
        </div>
      </header>

      <nav className="lc-places" aria-label="LEDGER">
        {places.map((p) => (
          <a key={p.place} className="lc-place" href={house.href(p.to)} onClick={go(p.to)} aria-current={here === p.place ? 'page' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>

      <IntroNote />
      <div className="lc-body">{children}</div>
    </div>
  );
}
