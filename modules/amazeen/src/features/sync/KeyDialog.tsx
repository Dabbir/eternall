import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import ui from '../../components/ui.module.css';
import { downloadText } from '../../lib/download';
import styles from './Sync.module.css';

interface KeyDialogProps {
  open: boolean;
  keyText: string;
  /** `new`: just created, the person must confirm they've kept it. `view`: showing it again. */
  mode: 'new' | 'view';
  onClose: () => void;
}

function fileFor(key: string): string {
  return [
    'AMAZEEN sync key',
    '',
    key,
    '',
    'Keep this somewhere safe (a password manager is ideal).',
    'Anyone with this key can read your journal. Without it, nobody can restore it, not even us.',
    'On another device: Office → Sync → Connect to your journal, then enter the key.',
    '',
  ].join('\n');
}

/** Shows the sync key. Because losing it means losing the cloud copy, a new key must be confirmed before moving on. */
export function KeyDialog({ open, keyText, mode, onClose }: KeyDialogProps) {
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const groups = keyText.split('-');
  const last = groups.at(-1) ?? '';
  const confirmed = mode === 'view' || typed.trim().toUpperCase() === last;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(keyText);
      toast.push({ message: 'Key copied. Paste it somewhere safe.' });
    } catch {
      toast.push({ tone: 'error', message: 'Couldn’t copy automatically. Select the key and copy it by hand.' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setTyped('');
        onClose();
      }}
      title="Your sync key"
      actions={
        <button
          type="button"
          className={`${ui.btn} ${ui.dark}`}
          disabled={!confirmed}
          onClick={() => {
            setTyped('');
            onClose();
          }}
        >
          {mode === 'new' ? 'I’ve saved it' : 'Done'}
        </button>
      }
    >
      <p className={ui.dialogText}>
        {mode === 'new'
          ? 'This key is the only way to open your journal on another device. It never leaves this device unencrypted.'
          : 'Enter this on another device to connect it to your journal.'}
      </p>
      <p className={styles.keyBox} aria-label="Sync key" data-testid="sync-key">
        {groups.map((g, i) => (
          <span key={i} className={styles.keyGroup}>
            {g}
          </span>
        ))}
      </p>
      <div className={styles.keyActions}>
        <button type="button" className={`${ui.btn} ${ui.small}`} onClick={() => void copy()}>
          Copy
        </button>
        <button type="button" className={`${ui.btn} ${ui.small}`} onClick={() => downloadText(fileFor(keyText), 'amazeen-sync-key.txt', 'text/plain')}>
          Download
        </button>
      </div>
      <p className={styles.warning}>
        <strong>If you lose this key, your cloud copy can’t be recovered.</strong> Not by us, not by anyone. That’s what keeps it private. Your writing on your devices stays.
      </p>
      {mode === 'new' && (
        <div className={styles.confirm}>
          <label className={ui.label} htmlFor="key-confirm">
            To confirm you’ve saved it, type the last four characters
          </label>
          <input
            id="key-confirm"
            className={`${ui.input} ${styles.confirmInput}`}
            value={typed}
            maxLength={4}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      )}
    </Dialog>
  );
}
