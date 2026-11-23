import type { ReactNode } from 'react';
import { useHouse } from './house';

export interface AppBarPlace {
  label: string;
  /** A shorter word for the phone's bottom bar, e.g. "Cards" for "Card file". */
  short?: string;
  /** Path inside the app, e.g. "/budget". */
  to: string;
  /** "page" for the place shown now; true for the place it belongs to (a person's card is in the card file). */
  current?: 'page' | true | undefined;
}

export interface AppBarProps {
  /** The way back to the house. The label is the app's own words ("Close the book"). */
  exit: { label: string; ornament?: ReactNode };
  /** The app's name and function line, linking to its home. */
  title: { name: string; fn: string; ornament?: ReactNode };
  places: readonly AppBarPlace[];
  /** Something of the app's own beside the places on a wide screen (AMAZEEN's deadline). */
  extra?: ReactNode;
}

/**
 * One app bar for every app (docs/adr/0013, docs/DESIGN.md §2). The kit owns **where** things are
 * and how they behave; each app owns how they look, through these class hooks in its kit stylesheet:
 *
 *   .appbar  .appbar__exit  .appbar__title  .appbar__name  .appbar__fn  .appbar__places
 *   .appbar__place  .appbar__extra  .appbar__tools  .appbar__tool  .appbar__primary  .appbar__dot
 *
 * Wide screens: one sticky top bar — back, name, places, then search, lock and the primary action.
 * Phones (< 820px): the top bar keeps back, name, search and lock; the places and the raised primary
 * action sit in a bar fixed to the bottom, within a thumb's reach. `--appbar-bottom` is set for the
 * page, toasts and dialogs to clear it. Search, lock and the primary action come from the house, so
 * no app can leave one out.
 */
export function AppBar({ exit, title, places, extra }: AppBarProps) {
  const house = useHouse();
  const primary = house.primaryAction;
  const go = (to: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href(to));
  };
  return (
    <header className="appbar">
      <button type="button" className="appbar__exit" onClick={house.leave} aria-label={`${exit.label}, back to ETERNALL`} title={exit.label}>
        {exit.ornament}
        <span className="appbar__exit-label">{exit.label}</span>
        {house.notices > 0 && <span className="appbar__dot" aria-hidden="true" />}
      </button>

      <a className="appbar__title" href={house.href('/')} onClick={go('/')}>
        {title.ornament}
        <span className="appbar__name">{title.name}</span>
        <span className="appbar__fn">{title.fn}</span>
      </a>

      {places.length > 0 && (
        <nav className={`appbar__places${primary ? ' has-primary' : ''}`} aria-label={title.name}>
          {places.map((p) => (
            <a key={p.to} className="appbar__place" href={house.href(p.to)} onClick={go(p.to)} aria-current={p.current === 'page' ? 'page' : p.current ? 'true' : undefined}>
              {p.short ? (
                <>
                  <span className="appbar__place-long">{p.label}</span>
                  <span className="appbar__place-short" aria-hidden="true">
                    {p.short}
                  </span>
                </>
              ) : (
                p.label
              )}
            </a>
          ))}
        </nav>
      )}

      {extra && <div className="appbar__extra">{extra}</div>}

      <div className="appbar__tools">
        <button type="button" className="appbar__tool" onClick={house.openSearch} aria-label="Search" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
        </button>
        {house.canLock && (
          <button type="button" className="appbar__tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
              <path d="M8 10.5V8a4 4 0 018 0v2.5" />
            </svg>
          </button>
        )}
        {primary && (
          <button type="button" className="appbar__primary" onClick={primary.run} aria-label={primary.label}>
            <span className="appbar__primary-plus" aria-hidden="true">
              +
            </span>
            <span className="appbar__primary-label">{primary.label}</span>
          </button>
        )}
      </div>
    </header>
  );
}
