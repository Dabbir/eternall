import type { ReactNode } from 'react';
import { useHouse, usePrimaryActionValue } from '@eternall/kit';
import { Icon } from '@eternall/ui';
import { refrain } from '../index';

/**
 * REFRAIN's own frame (docs/design/refrain.md §Chrome; docs/adr/0011): the head of a score.
 * Five hairlines run under everything; the exit is the score's end mark ("Fine", with its double
 * bar); places are movements; the primary action is set like a dynamic marking.
 */
export function Chrome({ movement, children }: { movement: { no: string; name: string } | null; children: ReactNode }) {
  const house = useHouse();
  const primary = usePrimaryActionValue();
  const home = (e: { preventDefault(): void }) => {
    e.preventDefault();
    house.navigate(house.href('/'));
  };
  return (
    <div className="rc">
      <header className="rc-head">
        <span className="rc-staff" aria-hidden="true" />
        <button type="button" className="rc-fine" onClick={house.leave} aria-label={`${refrain.brand.leaveLabel}: leave the score, back to your lifeline`}>
          <span className="rc-fine__bar" aria-hidden="true" />
          <span className="rc-fine__text">
            <em>{refrain.brand.leaveLabel}</em>
            <span>leave the score</span>
          </span>
          {house.notices > 0 && <span className="rc-fine__dot" role="img" aria-label={`${house.notices} waiting elsewhere`} />}
        </button>

        <a className="rc-title" href={house.href('/')} onClick={home}>
          <span className="rc-title__name">{refrain.name}</span>
          <span className="rc-title__fn">{refrain.functionLine}</span>
        </a>

        <div className="rc-tools">
          <button type="button" className="rc-tool" onClick={house.openSearch} aria-label="Search REFRAIN" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K">
            <Icon name="search" size={18} />
          </button>
          {house.canLock && (
            <button type="button" className="rc-tool" onClick={house.lock} aria-label="Lock" title="Lock (⌘⇧L)">
              <Icon name="lock" size={18} />
            </button>
          )}
          {primary && (
            <button type="button" className="rc-mark" onClick={primary.run}>
              {primary.label}
            </button>
          )}
        </div>
      </header>

      <nav className="rc-movements" aria-label="REFRAIN">
        <a className="rc-movement" href={house.href('/')} onClick={home} aria-current={movement ? undefined : 'page'}>
          <span className="rc-movement__no">I.</span> The score
        </a>
        {movement && (
          <span className="rc-movement" aria-current="page">
            <span className="rc-movement__no">{movement.no}</span> {movement.name}
          </span>
        )}
      </nav>

      <div className="rc-body">{children}</div>
    </div>
  );
}
