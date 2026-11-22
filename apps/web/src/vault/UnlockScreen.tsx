import { useEffect, useRef, useState } from 'react';
import type { Keyring, UnlockInput } from '@eternall/vault';
import { Button, TextField, Wordmark } from '@eternall/ui';

interface Props {
  keyring: Keyring;
  /** The door the person arrived through, so the threshold wears that imprint's theme. */
  imprint: string | null;
  onUnlock(input: UnlockInput): Promise<void>;
}

/** The threshold (docs/design/eternall.md §5.3): the only centred layout in the house, on purpose. */
export function UnlockScreen({ keyring, imprint, onUnlock }: Props) {
  const methods = keyring.methods;
  const [mode, setMode] = useState<'main' | 'recovery'>('main');
  const [pass, setPass] = useState('');
  const [recovery, setRecovery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fails = useRef(0);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const attempt = async (input: UnlockInput) => {
    if (wait > 0) return;
    setBusy(true);
    setError(null);
    try {
      await onUnlock(input);
    } catch (e) {
      fails.current++;
      // After five misses, wait a little longer each time. Never wipe anything.
      if (fails.current >= 5) setWait(Math.min(300, 2 ** (fails.current - 4) * 5));
      setError(e instanceof Error ? e.message : 'Couldn’t unlock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="unlock" data-imprint={imprint ?? 'house'}>
      <main className="unlock__card" id="main">
        <Wordmark height={13} />
        <h1 className="unlock__title">Your archive is locked.</h1>
        {mode === 'main' ? (
          <>
            {methods.includes('passkey') && (
              <Button variant="primary" busy={busy} onClick={() => void attempt({ kind: 'passkey' })}>
                Unlock with your passkey
              </Button>
            )}
            {methods.includes('passphrase') && (
              <form
                className="unlock__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void attempt({ kind: 'passphrase', passphrase: pass });
                }}
              >
                <TextField label="Passphrase" type="password" autoComplete="current-password" autoFocus value={pass} error={error ?? undefined} onChange={(e) => setPass(e.target.value)} />
                <Button variant="primary" type="submit" busy={busy} disabled={!pass || wait > 0}>
                  {wait > 0 ? `Try again in ${wait}s` : 'Unlock'}
                </Button>
              </form>
            )}
            {!methods.includes('passphrase') && error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="unlock__link" onClick={() => setMode('recovery')}>
              Use your recovery key
            </button>
          </>
        ) : (
          <form
            className="unlock__form"
            onSubmit={(e) => {
              e.preventDefault();
              void attempt({ kind: 'recovery', text: recovery });
            }}
          >
            <TextField label="Recovery key" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} autoFocus value={recovery} error={error ?? undefined} className="mono" onChange={(e) => setRecovery(e.target.value)} />
            <Button variant="primary" type="submit" busy={busy} disabled={!recovery}>
              Unlock
            </Button>
            <button type="button" className="unlock__link" onClick={() => setMode('main')}>
              Back
            </button>
          </form>
        )}
        <p className="unlock__note">Only you can open this archive. Not even ETERNALL can read it.</p>
      </main>
    </div>
  );
}
