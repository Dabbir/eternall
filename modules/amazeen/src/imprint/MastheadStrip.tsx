import type { ReactNode } from 'react';
import { timeUntil } from '../domain/dates';
import { Link, paths, useRouter } from '../router/router';
import { useHotkeys } from '../state/hooks';
import { useNow } from '../state/now';
import { useStore } from '../state/store';
import { StorageBanner } from '../components/AppShell';
import { OfferedQuotes } from './OfferedQuotes';
import styles from './MastheadStrip.module.css';

const NAV = [
  { name: 'desk', label: 'Desk', to: paths.desk() },
  { name: 'shelf', label: 'Shelf', to: paths.shelf() },
  { name: 'settings', label: 'Office', to: paths.settings() },
] as const;

/**
 * AMAZEEN's frame inside ETERNALL (docs/design/amazeen.md §6): the shared spine above,
 * and this masthead strip in AMAZEEN's own voice — sections in Fraunces small caps and the press deadline.
 */
export function MastheadStrip({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();
  const { data, current } = useStore();
  const now = useNow();
  useHotkeys({
    n: (e) => {
      e.preventDefault();
      navigate(paths.write('note'));
    },
    w: (e) => {
      e.preventDefault();
      navigate(paths.write('story'));
    },
    '/': (e) => {
      e.preventDefault();
      if (route.name === 'shelf') document.getElementById('shelf-search')?.focus();
      else navigate(paths.shelf());
    },
  });
  return (
    <div className={styles.frame}>
      <nav className={styles.strip} aria-label="AMAZEEN">
        <Link to={paths.desk()} className={styles.masthead}>
          {data.magazine?.title ?? 'Amazeen'}
          <span className={styles.issue}> · Nº {current.number}</span>
        </Link>
        <ul className={styles.tabs}>
          {NAV.map((n) => (
            <li key={n.name}>
              <Link to={n.to} className={styles.tab} aria-current={route.name === n.name ? 'page' : undefined}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.deadline} title={`Issue No. ${current.number} goes to press in ${timeUntil(current.weekEnd, now)}`}>
          <span className={styles.pulse} aria-hidden="true" />
          {timeUntil(current.weekEnd, now)} to press
        </p>
      </nav>
      <StorageBanner />
      {route.name === 'desk' && <OfferedQuotes />}
      <div className={styles.main}>{children}</div>
    </div>
  );
}
