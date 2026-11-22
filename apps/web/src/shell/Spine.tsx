import type { ImprintDefinition } from '@eternall/core';
import type { PrimaryAction } from '@eternall/kit';
import { Icon, LogoMark } from '@eternall/ui';
import { linkProps } from './router';
import { useLock } from '../vault/lockContext';

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

interface Props {
  current: ImprintDefinition | null;
  primary: PrimaryAction | null;
  focus: boolean;
  badge: boolean;
  onDoors(): void;
  onSearch(): void;
}

/**
 * The spine: the only UI identical in every imprint (docs/DESIGN.md §2).
 * Ink-black in both themes, so each imprint's colour owns the page.
 */
export function Spine({ current, primary, focus, badge, onDoors, onSearch }: Props) {
  const { canLock, lock } = useLock();
  const name = current?.name ?? 'ETERNALL';
  const fn = current?.functionLine ?? 'Your life in weeks';
  return (
    <header className={`spine ${focus ? 'spine--focus' : ''}`}>
      <button type="button" className="spine__house" onClick={onDoors} aria-label="Open the doors menu" aria-haspopup="dialog">
        <LogoMark size={26} />
        {badge && <span className="spine__badge" aria-label="Something is waiting" />}
      </button>

      <a className="spine__title" {...linkProps(current ? current.basePath : '/')}>
        {current && <span className="spine__dot" style={{ ['--c' as string]: current.accent.dark }} aria-hidden="true" />}
        <span className="spine__name">{name}</span>
        <span className="spine__fn">· {fn}</span>
      </a>

      <div className="spine__tools">
        <button type="button" className="spine__search" onClick={onSearch} aria-keyshortcuts={isMac() ? 'Meta+K' : 'Control+K'}>
          <Icon name="search" size={16} />
          <span className="spine__search-label">Search</span>
          <kbd>{isMac() ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        {primary && (
          <button type="button" className="spine__primary" onClick={primary.run}>
            <Icon name="pen" size={16} />
            <span>{primary.label}</span>
          </button>
        )}
        {canLock && (
          <button type="button" className="spine__icon" onClick={lock} aria-label="Lock now" title="Lock now (⌘⇧L)" aria-keyshortcuts="Meta+Shift+L Control+Shift+L">
            <Icon name="lock" size={18} />
          </button>
        )}
        {!focus && (
          <a className="spine__icon" {...linkProps('/settings')} aria-label="Settings" title="Settings">
            <Icon name="settings" size={18} />
          </a>
        )}
      </div>
    </header>
  );
}
