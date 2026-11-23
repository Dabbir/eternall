import type { ReactNode } from 'react';
import { IntroNote, useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { ledger } from '../index';
import { monthKey, monthLabel } from '../ledger';

export type LedgerPlace = 'month' | 'budget' | 'import' | 'words';

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/**
 * LEDGER's own frame (docs/design/ledger.md §Chrome; ADR 0011/0012): a ledger's **thumb index**
 * cut into the right edge of the page. The clasp closes the book (back to the house), the year
 * sits at the top of the index, the twelve months are notches you jump to in one tap (the months
 * still to come open too, to plan their budget), then the pages: The month, Budget and Your words; and at the foot search, the lock and "Add an entry". The page itself
 * carries only a running head with the name and function line.
 */
export function Chrome({ here, month, children }: { here: LedgerPlace; month: string; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const current = monthKey(house.today);
  const year = Number(month.slice(0, 4));
  const thisYear = Number(current.slice(0, 4));
  const base = here === 'budget' ? '/budget' : '';
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  const jumpYear = (y: number) => {
    const m = `${y}-${month.slice(5)}`;
    house.navigate(house.href(`${base}/${m > current ? current : m}`));
  };
  return (
    <div className="lc">
      <div className="lc-page">
        <header className="lc-running">
          <a href={house.href('/')} onClick={go('/')} className="lc-running__name">
            {ledger.name}
          </a>
          <span className="lc-running__fn">{ledger.functionLine}</span>
        </header>
        <IntroNote />
        <div className="lc-body">{children}</div>
      </div>

      <nav className="lr" aria-label="LEDGER">
        <button type="button" className="lr-clasp" onClick={house.leave} aria-label={`${ledger.brand.leaveLabel}, back to your lifeline`} title={ledger.brand.leaveLabel}>
          <span className="lr-clasp__strap" aria-hidden="true" />
          <span className="lr-vert">{ledger.brand.leaveLabel}</span>
          {house.notices > 0 && <span className="lr-dot" aria-hidden="true" />}
        </button>

        <div className="lr-year">
          <button type="button" className="lr-year__btn" onClick={() => jumpYear(year - 1)} aria-label={`Previous year, ${year - 1}`}>
            <span aria-hidden="true">‹</span>
          </button>
          <span className="lr-year__num lg-num">{year}</span>
          <button type="button" className="lr-year__btn" disabled={year >= thisYear} onClick={() => jumpYear(year + 1)} aria-label={`Next year, ${year + 1}`}>
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <ol className="lr-thumbs" aria-label={`Months of ${year}`}>
          {LETTERS.map((letter, i) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            const future = key > current;
            const on = (here === 'month' || here === 'budget') && key === month;
            return (
              <li key={key}>
                <a className={future ? 'lr-thumb is-future' : 'lr-thumb'} href={house.href(`${base}/${key}`)} onClick={go(`${base}/${key}`)} aria-current={on ? 'page' : undefined} aria-label={future ? `${monthLabel(key)}, not begun` : monthLabel(key)}>
                  {letter}
                </a>
              </li>
            );
          })}
        </ol>

        <div className="lr-tabs">
          <a className="lr-tab" href={house.href(`/${month}`)} onClick={go(`/${month}`)} aria-current={here === 'month' ? 'page' : undefined}>
            <span className="lr-vert">The month</span>
          </a>
          <a className="lr-tab" href={house.href(`/budget/${month}`)} onClick={go(`/budget/${month}`)} aria-current={here === 'budget' ? 'page' : undefined}>
            <span className="lr-vert">Budget</span>
          </a>
          <a className="lr-tab" href={house.href('/words')} onClick={go('/words')} aria-current={here === 'words' ? 'page' : undefined}>
            <span className="lr-vert">Your words</span>
          </a>
        </div>

        <div className="lr-tools">
          <button type="button" className="lr-tool" onClick={house.openSearch} aria-label="Search LEDGER" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={18} />
          </button>
          {house.canLock && (
            <button type="button" className="lr-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={18} />
            </button>
          )}
          {primary && (
            <button type="button" className="lr-write" onClick={primary.run} aria-label={primary.label} title={primary.label}>
              <span aria-hidden="true">+</span>
              <span className="lr-vert">{primary.label}</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
