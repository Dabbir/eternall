import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import ui from '../../components/ui.module.css';
import { useSync } from '../../sync/SyncProvider';
import styles from './Sync.module.css';

/** Connect this device to an existing journal by entering its sync key. */
export function JoinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sync = useSync();
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const close = (): void => {
    if (busy) return;
    setValue('');
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await sync.join(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setValue('');
    onClose();
    toast.push({ message: 'Connected. Bringing in your journal…' });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Connect to your journal"
      actions={
        <>
          <button type="button" className={`${ui.btn} ${ui.quiet}`} onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="join-form" className={`${ui.btn} ${ui.dark}`} disabled={busy || value.trim() === ''} aria-busy={busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </>
      }
    >
      <form id="join-form" onSubmit={(e) => void submit(e)} noValidate>
        <p className={ui.dialogText}>Enter the sync key from your other device. What’s on this device is combined with your journal; nothing is replaced.</p>
        <label className={ui.label} htmlFor={inputId} style={{ marginTop: 18 }}>
          Sync key
        </label>
        <input
          id={inputId}
          className={`${ui.input} ${styles.keyInput}`}
          value={value}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && (
          <p id={errorId} className={ui.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
