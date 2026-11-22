import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { capsuleStatus } from '../../domain/capsule';
import { hrefFor, navigate, type RouteName } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Wordmark } from '../../components/ui/Logo';
import { CommandPalette } from './CommandPalette';

const NAV: { name: RouteName; label: string; icon: IconName }[] = [
  { name: 'lifeline', label: 'Lifeline', icon: 'grid' },
  { name: 'archive', label: 'Archive', icon: 'book' },
  { name: 'capsules', label: 'Capsules', icon: 'seal' },
  { name: 'chapters', label: 'Chapters', icon: 'chapters' },
  { name: 'almanac', label: 'Almanac', icon: 'almanac' },
];

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function AppShell({ route, children }: { route: RouteName; children: ReactNode }) {
  const { data, today, saveStatus } = useProfileStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ready = data.capsules.filter((c) => capsuleStatus(c, today) === 'ready').length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const label = NAV.find((n) => n.name === route)?.label ?? 'Settings';
    document.title = `${label} · ETERNALL`;
  }, [route]);

  const link = (name: RouteName) => ({
    href: hrefFor(name),
    'aria-current': route === name ? ('page' as const) : undefined,
    onClick: (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(name);
      window.scrollTo({ top: 0 });
    },
  });

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="masthead">
        <a className="masthead__brand" {...link('lifeline')} aria-label="ETERNALL — go to your lifeline">
          <Wordmark height={13} />
        </a>
        <nav className="masthead__nav" aria-label="Primary">
          {NAV.map((n, i) => (
            <a key={n.name} className="masthead__link" {...link(n.name)}>
              <span className="masthead__num mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              {n.label}
              {n.name === 'capsules' && ready > 0 && <span className="badge" aria-label={`${ready} ready to open`}>{ready}</span>}
            </a>
          ))}
        </nav>
        <div className="masthead__tools">
          <button type="button" className="palette-trigger" onClick={() => setPaletteOpen(true)} aria-keyshortcuts={isMac() ? 'Meta+K' : 'Control+K'}>
            <Icon name="search" size={16} />
            <span className="palette-trigger__label">Search & jump</span>
            <kbd className="mono">{isMac() ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <a className={`icon-btn ${route === 'settings' ? 'is-on' : ''}`} {...link('settings')} aria-label="Settings" title="Settings">
            <Icon name="settings" size={18} />
          </a>
        </div>
      </header>

      {!saveStatus.ok && (
        <div className="save-warning" role="alert">
          <Icon name="lock" size={16} />
          {saveStatus.reason === 'quota'
            ? 'This browser is out of storage space — new changes aren’t being saved. Export a backup from Settings.'
            : 'This browser is blocking storage (private mode?) — changes will be lost when you close the tab. Export a backup from Settings.'}
        </div>
      )}

      <main id="main" className="page" tabIndex={-1}>
        {children}
      </main>

      <nav className="tabbar" aria-label="Primary">
        {NAV.map((n) => (
          <a key={n.name} className="tabbar__link" {...link(n.name)}>
            <span className="tabbar__icon">
              <Icon name={n.icon} size={22} />
              {n.name === 'capsules' && ready > 0 && <span className="tabbar__dot" aria-label={`${ready} ready to open`} />}
            </span>
            <span className="tabbar__label">{n.label}</span>
          </a>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
