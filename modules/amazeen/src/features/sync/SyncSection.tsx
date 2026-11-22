import { useId, useState } from 'react';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import ui from '../../components/ui.module.css';
import { timeAgo } from '../../domain/dates';
import { useNow } from '../../state/now';
import { useSync } from '../../sync/SyncProvider';
import settings from '../settings/Settings.module.css';
import { JoinDialog } from './JoinDialog';
import { KeyDialog } from './KeyDialog';
import styles from './Sync.module.css';

const DELETE_WORD = 'DELETE';

export function statusLine(phase: ReturnType<typeof useSync>['status']['phase'], lastSyncedAt: string | null, message: string | null, now: Date): string {
  switch (phase) {
    case 'off':
      return 'Off. This journal lives only on this device.';
    case 'syncing':
      return 'Syncing…';
    case 'idle':
      return lastSyncedAt ? `Synced ${timeAgo(new Date(lastSyncedAt), now)}.` : 'Connected.';
    case 'offline':
      return message ?? 'Offline. Changes will sync when you’re back.';
    case 'auth':
    case 'error':
      return message ?? 'Sync ran into a problem.';
  }
}

/** Office → Sync: turn on end-to-end encrypted sync, connect another device, or turn it off. */
export function SyncSection() {
  const sync = useSync();
  const toast = useToast();
  const now = useNow();
  const { phase, lastSyncedAt, message } = sync.status;
  const connected = phase !== 'off';
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteId = useId();

  const start = async (): Promise<void> => {
    setStarting(true);
    try {
      setNewKey(await sync.setup());
    } catch (err) {
      const offline = err instanceof Error && 'code' in err && (err as { code?: string }).code === 'network';
      toast.push({ tone: 'error', message: offline ? 'You’re offline. Connect to the internet to turn on sync.' : 'Couldn’t reach the sync service. Please try again.' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className={settings.section} aria-labelledby="s-sync">
      <div className={settings.sectionIntro}>
        <h2 id="s-sync">Sync</h2>
        <p>Keep one journal across your phone and laptop, end-to-end encrypted.</p>
      </div>

      <div className={styles.panel}>
        <p className={styles.state} data-phase={phase} role="status">
          <span className={styles.stateDot} aria-hidden="true" />
          {statusLine(phase, lastSyncedAt, message, now)}
        </p>

        {!sync.supported && <p className={styles.note}>Sync needs IndexedDB, which this browser isn’t allowing (often private browsing).</p>}

        {sync.supported && !connected && (
          <>
            <ul className={styles.facts}>
              <li>Your entries are encrypted on this device before they’re sent. The server only ever holds scrambled data it can’t read.</li>
              <li>You connect other devices with a sync key. There’s no email or password to forget or leak.</li>
              <li>
                <strong>If you lose the key, the cloud copy can’t be recovered.</strong> Keep it in a password manager.
              </li>
            </ul>
            <div className={styles.buttons}>
              <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={() => void start()} disabled={starting} aria-busy={starting}>
                {starting ? 'Turning on…' : 'Turn on sync'}
              </button>
              <button type="button" className={ui.btn} onClick={() => setJoining(true)}>
                Connect to your journal
              </button>
            </div>
          </>
        )}

        {sync.supported && connected && (
          <div className={styles.buttons}>
            {phase !== 'auth' && (
              <button
                type="button"
                className={ui.btn}
                disabled={phase === 'syncing'}
                onClick={() => {
                  setBusy(true);
                  void sync.syncNow().finally(() => setBusy(false));
                }}
                aria-busy={busy || phase === 'syncing'}
              >
                Sync now
              </button>
            )}
            {phase !== 'auth' && (
              <button type="button" className={ui.btn} onClick={() => setShowKey(true)}>
                Show my key
              </button>
            )}
            <button type="button" className={`${ui.btn} ${ui.quiet}`} onClick={() => setConfirmDisconnect(true)}>
              Disconnect this device
            </button>
            {phase !== 'auth' && (
              <button type="button" className={`${ui.btn} ${ui.danger}`} onClick={() => setDeleting(true)}>
                Delete cloud copy
              </button>
            )}
          </div>
        )}
      </div>

      <KeyDialog open={newKey !== null} keyText={newKey ?? ''} mode="new" onClose={() => setNewKey(null)} />
      <KeyDialog open={showKey} keyText={showKey ? (sync.keyText() ?? '') : ''} mode="view" onClose={() => setShowKey(false)} />
      <JoinDialog open={joining} onClose={() => setJoining(false)} />

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect this device?"
        message="Your entries stay here. The cloud copy and your other devices aren’t affected, and you can reconnect any time with your sync key."
        confirmLabel="Disconnect"
        cancelLabel="Stay connected"
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false);
          void sync.disconnect().then(() => toast.push({ message: 'This device is no longer syncing.' }));
        }}
      />

      <Dialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setDeleteText('');
        }}
        title="Delete the cloud copy?"
        actions={
          <>
            <button
              type="button"
              className={`${ui.btn} ${ui.quiet}`}
              onClick={() => {
                setDeleting(false);
                setDeleteText('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.danger}`}
              disabled={deleteText.trim().toUpperCase() !== DELETE_WORD}
              onClick={() => {
                setDeleting(false);
                setDeleteText('');
                void sync.deleteCloud().then(
                  () => toast.push({ message: 'The cloud copy was deleted.' }),
                  () => toast.push({ tone: 'error', message: 'Couldn’t reach the sync service, so nothing was deleted. Try again when you’re online.' }),
                );
              }}
            >
              Delete cloud copy
            </button>
          </>
        }
      >
        <p className={ui.dialogText}>
          This permanently deletes the encrypted copy. Every device connected with your key stops syncing. The entries stay on each device. Type <strong>{DELETE_WORD}</strong> to confirm.
        </p>
        <label className="visually-hidden" htmlFor={deleteId}>
          Type {DELETE_WORD} to confirm
        </label>
        <input id={deleteId} className={`${ui.input} ${settings.eraseInput}`} value={deleteText} autoComplete="off" autoFocus onChange={(e) => setDeleteText(e.target.value)} />
      </Dialog>
    </section>
  );
}
