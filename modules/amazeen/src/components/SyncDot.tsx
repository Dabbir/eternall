import { timeAgo } from '../domain/dates';
import { Link, paths } from '../router/router';
import { useNow } from '../state/now';
import { useSync } from '../sync/SyncProvider';
import styles from '../features/sync/Sync.module.css';

/** A small light that shows whether this device is in step with the cloud. Hidden when sync is off. */
export function SyncDot({ className }: { className?: string | undefined }) {
  const { status } = useSync();
  const now = useNow();
  if (status.phase === 'off') return null;
  const text =
    status.phase === 'syncing'
      ? 'syncing'
      : status.phase === 'idle'
        ? status.lastSyncedAt
          ? `synced ${timeAgo(new Date(status.lastSyncedAt), now)}`
          : 'connected'
        : status.phase === 'offline'
          ? 'offline'
          : 'needs attention';
  return (
    <Link to={paths.settings()} className={`${styles.dot} ${className ?? ''}`} data-phase={status.phase} aria-label={`Sync: ${text}`} title={`Sync: ${text}`} />
  );
}
