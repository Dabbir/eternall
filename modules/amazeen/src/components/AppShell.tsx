import type { ReactNode } from 'react';
import { timeUntil } from '../domain/dates';
import { Link, paths, useRouter } from '../router/router';
import type { Route } from '../router/router';
import { useHotkeys } from '../state/hooks';
import { useNow } from '../state/now';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Monogram } from './Logo';
import { SyncDot } from './SyncDot';
import { ThemeToggle, toggleTheme, visibleThemeSwitch } from './ThemeToggle';
import { useTheme } from '../lib/theme';
import styles from './AppShell.module.css';

interface NavItem {
  name: Route['name'] | 'write';
  label: string;
  to: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { name: 'desk', label: 'Desk', to: paths.desk(), icon: 'desk' },
  { name: 'write', label: 'Write', to: paths.write('story'), icon: 'edit' },
  { name: 'shelf', label: 'Shelf', to: paths.shelf(), icon: 'book' },
  { name: 'settings', label: 'Office', to: paths.settings(), icon: 'cog' },
];

function StorageBanner() {
  const { saveStatus, loadStatus } = useStore();
  if (loadStatus === 'corrupt') {
    return (
      <div className={styles.banner} role="alert">
        We couldn’t read your saved archive. It hasn’t been touched — export a rescue copy from the{' '}
        <Link to={paths.settings()}>Office</Link> before writing anything new.
      </div>
    );
  }
  if (!saveStatus.ok) {
    return (
      <div className={styles.banner} role="alert">
        {saveStatus.reason === 'quota'
          ? 'This browser’s storage is full, so recent changes aren’t saved. Export your archive from the Office to keep a copy.'
          : 'Storage is unavailable (private browsing?), so changes will be lost when you close this tab.'}
      </div>
    );
  }
  return null;
}

/** Short countdown for the spine: "4d", "9h", "40m". */
function shortCountdown(target: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

/**
 * The production room's frame. On wide screens, a magazine spine runs down the left edge:
 * monogram, the sections set vertically like spine titles, the masthead, and the press deadline.
 * On phones, a slim masthead bar on top and index tabs along the bottom.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();
  const { data, current } = useStore();
  const now = useNow();
  const { theme } = useTheme();
  const masthead = data.magazine?.title ?? 'Amazeen';

  useHotkeys({
    n: (e) => {
      e.preventDefault();
      navigate(paths.write('note'));
    },
    w: (e) => {
      e.preventDefault();
      navigate(paths.write('story'));
    },
    t: () => toggleTheme(theme, visibleThemeSwitch()),
    '/': (e) => {
      e.preventDefault();
      if (route.name === 'shelf') document.getElementById('shelf-search')?.focus();
      else navigate(paths.shelf());
    },
  });

  const isCurrent = (item: NavItem) => (route.name === item.name ? 'page' : undefined);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <header className={styles.spine}>
        <Link to={paths.desk()} className={styles.brand}>
          <span className={styles.brandTile} aria-hidden="true">
            <Monogram className={styles.brandGlyph} />
          </span>
          <span className="visually-hidden">AMAZEEN — Desk</span>
        </Link>

        <nav className={styles.spineNav} aria-label="Primary">
          <ol>
            {NAV.map((item, i) => (
              <li key={item.name}>
                <Link to={item.to} className={styles.spineLink} aria-current={isCurrent(item)}>
                  <span className={styles.spineIndex} aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className={styles.spineLabel}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {/* A faint watermark of the masthead; drawn by CSS so it stays decorative. */}
        <span className={styles.spineTitle} data-text={`${masthead} · Nº ${current.number}`} aria-hidden="true" />

        <SyncDot className={styles.spineSync} />
        <ThemeToggle orientation="vertical" className={styles.spineToggle} />

        <p className={styles.deadline} title={`Issue No. ${current.number} goes to press in ${timeUntil(current.weekEnd, now)}`}>
          <span className={styles.pulse} aria-hidden="true" />
          <span className={styles.deadlineValue}>{shortCountdown(current.weekEnd, now)}</span>
          <span className={styles.deadlineLabel}>to press</span>
        </p>
      </header>

      <header className={styles.topbar}>
        <Link to={paths.desk()} className={styles.topBrand}>
          <span className={styles.brandTile} aria-hidden="true">
            <Monogram className={styles.brandGlyph} />
          </span>
          <span className={styles.topTitle}>{masthead}</span>
        </Link>
        <SyncDot className={styles.topSync} />
        <ThemeToggle size="small" className={styles.topToggle} />
        <span className={styles.topMeta}>
          Nº {current.number} · {shortCountdown(current.weekEnd, now)} to press
        </span>
      </header>

      <div className={styles.frame}>
        <StorageBanner />
        <main id="main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className={styles.tabs} aria-label="Sections">
        {NAV.map((item) =>
          item.name === 'write' ? (
            <Link key={item.name} to={item.to} className={styles.tabWrite}>
              <Icon name="plus" size={22} />
              <span>{item.label}</span>
            </Link>
          ) : (
            <Link key={item.name} to={item.to} className={styles.tab} aria-current={isCurrent(item)}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
