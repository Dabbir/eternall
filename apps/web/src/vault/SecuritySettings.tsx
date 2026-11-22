import { useState } from 'react';
import { todayISO } from '@eternall/core';
import { Button, Dialog, Segmented, TextField, useToast } from '@eternall/ui';
import { passkeysSupported, sealArchive, type LockInput, type LockKind, type UnlockInput } from '@eternall/vault';
import { useSettings } from '../shell/hooks';
import { LockSetup } from './LockSetup';
import { RecoveryKit } from './RecoveryKit';
import { useLock } from './lockContext';

const LABEL: Record<LockKind, string> = { passphrase: 'Passphrase', passkey: 'Passkey', device: 'This device only (no lock)' };
const AUTO = [
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 hour' },
  { value: '480', label: '8 hours' },
] as const;

/** Ask for proof of the current lock before changing it or revealing the recovery key. */
function Prove({ title, onProof, onClose }: { title: string; onProof(p: UnlockInput): Promise<void>; onClose(): void }) {
  const { keyring } = useLock();
  const methods = keyring?.methods ?? [];
  const [pass, setPass] = useState('');
  const [rec, setRec] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (p: UnlockInput) => {
    setBusy(true);
    setError(null);
    try {
      await onProof(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={title} eyebrow="Confirm it’s you">
      <div className="editor-form">
        {!useRecovery && methods.includes('device') && methods.length === 1 && (
          <Button variant="primary" busy={busy} onClick={() => void run({ kind: 'device' })}>
            Continue on this device
          </Button>
        )}
        {!useRecovery && methods.includes('passkey') && (
          <Button variant="primary" busy={busy} onClick={() => void run({ kind: 'passkey' })}>
            Confirm with your passkey
          </Button>
        )}
        {!useRecovery && methods.includes('passphrase') && (
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ kind: 'passphrase', passphrase: pass });
            }}
          >
            <TextField label="Current passphrase" type="password" autoComplete="current-password" autoFocus value={pass} error={error ?? undefined} onChange={(e) => setPass(e.target.value)} />
            <Button variant="primary" type="submit" busy={busy} disabled={!pass}>
              Continue
            </Button>
          </form>
        )}
        {useRecovery && (
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ kind: 'recovery', text: rec });
            }}
          >
            <TextField label="Recovery key" autoComplete="off" spellCheck={false} autoFocus value={rec} error={error ?? undefined} onChange={(e) => setRec(e.target.value)} />
            <Button variant="primary" type="submit" busy={busy} disabled={!rec}>
              Continue
            </Button>
          </form>
        )}
        {!methods.includes('passphrase') && error && !useRecovery && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="unlock__link" onClick={() => setUseRecovery((u) => !u)}>
          {useRecovery ? 'Back' : 'Use your recovery key instead'}
        </button>
      </div>
    </Dialog>
  );
}

export function SecuritySettings() {
  const api = useLock();
  const toast = useToast();
  const [settings, updateSettings] = useSettings();
  const [step, setStep] = useState<null | { kind: 'prove-change' } | { kind: 'choose'; proof: UnlockInput } | { kind: 'prove-reveal' } | { kind: 'reveal'; key: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ring = api.keyring;

  if (!ring || !api.store) {
    return (
      <div className="settings-stack">
        <p className="muted">Your archive isn’t locked yet. It lives in this tab only until you create your vault.</p>
        <Button variant="primary" icon="lock" onClick={api.requestSetup}>
          Lock it to me
        </Button>
      </div>
    );
  }

  const method = ring.methods[0] ?? 'device';
  return (
    <div className="settings-stack">
      <dl className="security-facts">
        <div>
          <dt>Lock</dt>
          <dd>{LABEL[method]}</dd>
        </div>
        <div>
          <dt>Encryption</dt>
          <dd>AES-256-GCM, on this device</dd>
        </div>
        <div>
          <dt>Recovery kit</dt>
          <dd className={ring.recoveryConfirmed ? '' : 'is-warn'}>{ring.recoveryConfirmed ? 'Saved' : 'Not confirmed yet'}</dd>
        </div>
      </dl>
      <div className="settings-actions">
        <Button variant="ghost" icon="lock" onClick={() => setStep({ kind: 'prove-change' })}>
          {method === 'device' ? 'Add a lock' : 'Change lock'}
        </Button>
        <Button variant={ring.recoveryConfirmed ? 'ghost' : 'primary'} onClick={() => setStep({ kind: 'prove-reveal' })}>
          Show recovery key
        </Button>
        {api.canLock && (
          <Button variant="quiet" onClick={api.lock}>
            Lock now
          </Button>
        )}
      </div>
      {api.canLock && <Segmented label="Lock automatically after" hideLabel={false} options={AUTO} value={String(settings.autoLockMinutes) as (typeof AUTO)[number]['value']} onChange={(v) => updateSettings({ autoLockMinutes: Number(v) })} />}

      {step?.kind === 'prove-change' && <Prove title={method === 'device' ? 'Add a lock' : 'Change lock'} onClose={() => setStep(null)} onProof={async (proof) => {
        await ring.unlock(proof);
        setStep({ kind: 'choose', proof });
      }} />}
      {step?.kind === 'choose' && (
        <LockSetup
          busy={busy}
          error={error}
          onClose={() => setStep(null)}
          onCreate={(input: LockInput) => {
            setBusy(true);
            setError(null);
            void ring
              .setLock(step.proof, input)
              .then(() => {
                toast({ message: input.kind === 'device' ? 'Lock removed. Your vault opens on this device without asking.' : 'Your vault has a new lock.', tone: 'accent' });
                setStep(null);
                api.refresh();
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Couldn’t change the lock.'))
              .finally(() => setBusy(false));
          }}
        />
      )}
      {step?.kind === 'prove-reveal' && <Prove title="Show recovery key" onClose={() => setStep(null)} onProof={async (proof) => setStep({ kind: 'reveal', key: await ring.revealRecoveryKey(proof) })} />}
      {step?.kind === 'reveal' && (
        <RecoveryKit
          recoveryKey={step.key}
          confirm={!ring.recoveryConfirmed}
          onDone={(confirmed) => {
            if (confirmed) void ring.confirmRecovery().then(api.refresh);
            setStep(null);
          }}
        />
      )}
    </div>
  );
}

/** Download the encrypted archive (default backup) — readable only with the recovery key. */
export async function exportSealed(api: ReturnType<typeof useLock>): Promise<boolean> {
  if (!api.store || !api.keyring?.vaultId) return false;
  const text = sealArchive(api.keyring.vaultId, await api.store.wire());
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `eternall-${todayISO()}.eternall`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export { passkeysSupported };
