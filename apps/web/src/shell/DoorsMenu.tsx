import type { ImprintDefinition, ReadContext } from '@eternall/core';
import { Dialog, Icon } from '@eternall/ui';
import { navigate } from './router';
import { IMPRINTS } from '../registry';

interface Props {
  open: boolean;
  onClose(): void;
  ctx: ReadContext;
  enabled: readonly ImprintDefinition[];
  used: readonly ImprintDefinition[];
  current: ImprintDefinition | null;
  hasProfile: boolean;
}

/** The doors between imprints, opened from the house mark (docs/design/eternall.md §5.2). */
export function DoorsMenu({ open, onClose, ctx, enabled, used, current, hasProfile }: Props) {
  const go = (href: string) => {
    onClose();
    navigate(href);
  };
  const discover = enabled.filter((d) => !used.includes(d));
  const offerLifeline = !hasProfile && used.length >= 2;
  const offCount = IMPRINTS.length - enabled.length;

  return (
    <Dialog open={open} onClose={onClose} title="Doors" hideTitle className="doors">
      <nav aria-label="Doors">
        <button type="button" className={`door door--house ${current === null ? 'is-here' : ''}`} onClick={() => go('/')}>
          <span className="door__name door__name--house">Home</span>
          <span className="door__fn">Your apps, and what to do today</span>
        </button>

        {used.length > 0 && <p className="doors__group">Your apps</p>}
        {used.map((d) => (
          <Door key={d.id} def={d} here={current?.id === d.id} badge={d.badge?.(ctx) ?? null} onOpen={() => go(d.basePath)} />
        ))}

        {discover.length > 0 && <p className="doors__group">{used.length ? 'Discover' : 'Apps'}</p>}
        {discover.map((d) => (
          <Door key={d.id} def={d} here={current?.id === d.id} badge={null} onOpen={() => go(d.basePath)} />
        ))}
      </nav>
      {offCount > 0 && (
        <button type="button" className="doors__more" onClick={() => go('/settings#apps')}>
          {offCount === 1 ? 'One more app' : `${offCount} more apps`} in Settings
        </button>
      )}
      <div className="doors__foot">
        <button type="button" className="doors__link" onClick={() => go('/life')}>
          <Icon name="today" size={16} /> Your life in weeks{offerLifeline ? ' · new' : ''}
        </button>
        <button type="button" className="doors__link" onClick={() => go('/settings')}>
          <Icon name="settings" size={16} /> Settings
        </button>
      </div>
    </Dialog>
  );
}

function Door({ def, here, badge, onOpen }: { def: ImprintDefinition; here: boolean; badge: string | null; onOpen(): void }) {
  return (
    <button type="button" className={`door door--${def.id} ${here ? 'is-here' : ''}`} onClick={onOpen} aria-current={here ? 'page' : undefined}>
      <span className="door__name door__name--plain" style={{ ['--c' as string]: def.accent.light, ['--c-dark' as string]: def.accent.dark }}>
        {def.label}
      </span>
      <span className="door__fn">
        {def.name} · {def.functionLine}
      </span>
      {badge && <span className="door__badge">{badge}</span>}
    </button>
  );
}
