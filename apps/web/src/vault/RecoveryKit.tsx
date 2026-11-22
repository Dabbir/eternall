import { useState } from 'react';
import { formatLong, todayISO } from '@eternall/core';
import { Button, Dialog, TextField } from '@eternall/ui';

/** F3: the recovery key, shown once at creation (and again in Settings after re-authentication). */
export function RecoveryKit({ recoveryKey, onDone, confirm = true }: { recoveryKey: string; onDone(confirmed: boolean): void; confirm?: boolean }) {
  const compact = recoveryKey.replace(/-/g, '');
  // Ask for characters 5–8: enough to prove it was written down, short enough to type.
  const challenge = compact.slice(4, 8);
  const [typed, setTyped] = useState('');
  const [copied, setCopied] = useState(false);
  const ok = typed.replace(/\s|-/g, '').toUpperCase() === challenge;

  const save = () => {
    const text = `ETERNALL recovery kit\n\nRecovery key: ${recoveryKey}\nCreated: ${formatLong(todayISO())}\n\nThis key is the only way back into your vault if you forget your passphrase or lose this device.\nKeep it somewhere safe and private. Anyone with it can open your vault.\nNobody — including ETERNALL — can recover your vault without it.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eternall-recovery-kit.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog
      open
      onClose={() => onDone(false)}
      title="Your recovery key"
      eyebrow="Recovery kit"
      className="recovery-kit"
      footer={
        <>
          {confirm && (
            <Button variant="quiet" onClick={() => onDone(false)}>
              I’ll save it later
            </Button>
          )}
          <span className="spacer" />
          <Button variant="primary" disabled={confirm && !ok} onClick={() => onDone(true)}>
            {confirm ? 'I’ve saved it' : 'Done'}
          </Button>
        </>
      }
    >
      <div className="recovery-kit__body">
        <p className="muted">It’s the only way back in if you forget how you lock your vault or lose this device. Nobody — including us — can recover your vault without it.</p>
        <p className="recovery-kit__key mono" aria-label={`Recovery key ${recoveryKey.split('').join(' ')}`}>
          {recoveryKey}
        </p>
        <div className="recovery-kit__actions">
          <Button variant="ghost" icon="download" onClick={save}>
            Save as file
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(recoveryKey).then(() => {
                setCopied(true);
                // Best-effort: clear the clipboard after a minute.
                window.setTimeout(() => void navigator.clipboard?.writeText('').catch(() => {}), 60_000);
              });
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {confirm && <TextField label={`To confirm you saved it, type characters 5 to 8 (the second group)`} value={typed} autoComplete="off" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />}
      </div>
    </Dialog>
  );
}
