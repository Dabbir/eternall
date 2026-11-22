import { useState } from 'react';
import { formatMedium } from '@eternall/core';
import { Button, Dialog, useToast } from '@eternall/ui';
import { navigate } from '../shell/router';
import { usePatron } from './patron';
import { useSync } from './SyncProvider';
import { useLock } from './lockContext';

/** Settings → Sync (Patron). Docs: FLOWS.md F9–F10, PRIVACY.md §6. */
export function SyncSettings() {
  const sync = useSync();
  const patron = usePatron();
  const lock = useLock();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lock.store) return <p className="muted">Lock your vault first; sync sends only what the vault has already encrypted.</p>;
  if (!patron.active || !patron.token) {
    return (
      <div className="settings-stack">
        <p className="muted">Keep one vault across your devices, end-to-end encrypted. Sync is part of ETERNALL Patron.</p>
        <Button variant="ghost" icon="sparkle" onClick={() => navigate('/patron')}>
          About Patron
        </Button>
      </div>
    );
  }
  if (!sync.state.enabled) {
    return (
      <div className="settings-stack">
        <p className="muted">Your records leave this device only as ciphertext. The server can’t read them, or tell which imprints you use.</p>
        <Button
          variant="primary"
          busy={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            void sync
              .enable(patron.token!)
              .then(() => toast({ message: 'Sync is on. Add another device with your recovery key.', tone: 'accent' }))
              .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Couldn’t turn on sync.'))
              .finally(() => setBusy(false));
          }}
        >
          Turn on sync
        </Button>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="settings-stack">
      <dl className="security-facts">
        <div>
          <dt>Status</dt>
          <dd className={sync.error ? 'is-warn' : ''}>{sync.busy ? 'Syncing…' : sync.error ? sync.error : 'Up to date'}</dd>
        </div>
        <div>
          <dt>Last synced</dt>
          <dd>{sync.state.lastSyncedAt ? `${formatMedium(sync.state.lastSyncedAt.slice(0, 10))}, ${sync.state.lastSyncedAt.slice(11, 16)}` : 'Not yet'}</dd>
        </div>
      </dl>
      <p className="muted">To add a device, open ETERNALL there, choose “I already have a vault”, and enter your recovery key (Security → Show recovery key).</p>
      <div className="settings-actions">
        <Button variant="ghost" onClick={() => void sync.syncNow()} busy={sync.busy}>
          Sync now
        </Button>
        <Button variant="quiet" onClick={() => setConfirmOff(true)}>
          Turn off sync…
        </Button>
      </div>
      {confirmOff && (
        <Dialog
          open
          onClose={() => setConfirmOff(false)}
          title="Turn off sync?"
          eyebrow="Sync"
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => void sync.disable(false).then(() => setConfirmOff(false))}>
                Stop on this device
              </Button>
              <Button variant="danger" onClick={() => void sync.disable(true).then(() => setConfirmOff(false))}>
                Delete the cloud copy
              </Button>
            </>
          }
        >
          <p className="muted">Nothing on this device changes either way. Deleting the cloud copy also stops your other devices from syncing.</p>
        </Dialog>
      )}
    </div>
  );
}
