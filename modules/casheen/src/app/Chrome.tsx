import type { ReactNode } from 'react';
import { AppBar, IntroNote, useHouse } from '@eternall/kit';
import { casheen } from '../index';
import { monthKey, monthLabel } from '../ledger';

export type LedgerPlace = 'month' | 'budget' | 'import' | 'words' | 'look';

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/**
 * CASHEEN's own frame (docs/design/casheen.md §Chrome; ADR 0012, ADR 0013), set on the shared app
 * bar: the book's clasp is the way back ("Close the book"), the name is set in spaced Caslon over a
 * double rule, and the places are The month, Budget and Your words.
 */
export function Chrome({ here, month, children }: { here: LedgerPlace; month: string; children: ReactNode }) {
  return (
    <div className="lc">
      <AppBar
        exit={{ label: casheen.brand.leaveLabel, ornament: <span className="lc-clasp" aria-hidden="true" /> }}
        title={{ name: casheen.name, fn: casheen.functionLine }}
        places={[
          { label: 'The month', short: 'Month', to: `/${month}`, current: here === 'month' ? 'page' : undefined },
          { label: 'Budget', to: `/budget/${month}`, current: here === 'budget' ? 'page' : undefined },
          { label: 'Your words', short: 'Words', to: '/words', current: here === 'words' ? 'page' : undefined },
        ]}
      />
      <IntroNote />
      <div className="lc-body">{children}</div>
    </div>
  );
}

/**
 * The ledger's thumb index, laid along the top of the page (docs/design/casheen.md §5.1): the year
 * with ‹ ›, then twelve half-moon notches, so any month is one tap away. Months still to come open
 * too, to plan their budget. On the budget page the notches open that month's budget.
 */
export function MonthIndex({ month, base }: { month: string; base: '' | '/budget' }) {
  const house = useHouse();
  const current = monthKey(house.today);
  const year = Number(month.slice(0, 4));
  const thisYear = Number(current.slice(0, 4));
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  const jumpYear = (y: number) => {
    const m = `${y}-${month.slice(5)}`;
    house.navigate(house.href(`${base}/${y === thisYear && m > current ? current : m}`));
  };
  return (
    <div className="lm">
      <div className="lm-year">
        <button type="button" className="lm-year__btn" onClick={() => jumpYear(year - 1)} aria-label={`Previous year, ${year - 1}`}>
          ‹
        </button>
        <span className="lm-year__num lg-num">{year}</span>
        <button type="button" className="lm-year__btn" disabled={year >= thisYear} onClick={() => jumpYear(year + 1)} aria-label={`Next year, ${year + 1}`}>
          ›
        </button>
      </div>
      <ol className="lm-notches" aria-label={`Months of ${year}`}>
        {LETTERS.map((letter, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`;
          const future = key > current;
          return (
            <li key={key}>
              <a
                className={future ? 'lm-notch is-future' : 'lm-notch'}
                href={house.href(`${base}/${key}`)}
                onClick={go(`${base}/${key}`)}
                aria-current={key === month ? 'page' : undefined}
                aria-label={future ? `${monthLabel(key)}, not begun` : monthLabel(key)}
              >
                {letter}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
