import { useState } from 'react';
import { Icon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { backupStatus } from '../../domain/backup';
import { readRaw, safeStorage, writeRaw } from '../../domain/storage';
import { useNow } from '../../state/now';
import { useStore } from '../../state/store';
import { useExportArchive } from '../../state/useExportArchive';
import styles from './Desk.module.css';

const SNOOZE_KEY = 'amazeen:backup-snoozed';

/** A quiet nudge to export when there are changes the last backup doesn't have. */
export function BackupReminder() {
  const { data } = useStore();
  const now = useNow();
  const exportArchive = useExportArchive();
  const [snoozedAt, setSnoozedAt] = useState(() => readRaw(safeStorage(), SNOOZE_KEY));
  const { due, daysSinceExport } = backupStatus(data, now, snoozedAt);
  if (!due) return null;

  const snooze = (): void => {
    const at = new Date().toISOString();
    writeRaw(safeStorage(), SNOOZE_KEY, at);
    setSnoozedAt(at);
  };

  return (
    <aside className={styles.backup} aria-label="Backup reminder">
      <Icon name="download" size={18} />
      <p>
        {daysSinceExport === null ? 'Your archive has never been backed up.' : `Last backup was ${daysSinceExport} days ago.`} Everything lives only in
        this browser. Keep a copy somewhere safe.
      </p>
      <button type="button" className={`${ui.btn} ${ui.dark} ${ui.small}`} onClick={exportArchive}>
        Export now
      </button>
      <button type="button" className={ui.iconBtn} aria-label="Remind me next week" title="Remind me next week" onClick={snooze}>
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}
