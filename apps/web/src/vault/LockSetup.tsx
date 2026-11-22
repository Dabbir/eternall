import { useEffect, useState } from 'react';
import { passkeysSupported, type LockInput } from '@eternall/vault';
import { Button, Dialog, Icon, TextField } from '@eternall/ui';

/** F2: "Before we keep this, let's lock it to you." (docs/FLOWS.md) */
export function LockSetup({ onCreate, onClose, busy, error }: { onCreate(input: LockInput): void; onClose(): void; busy: boolean; error: string | null }) {
  const [passkey, setPasskey] = useState(false);
  const [mode, setMode] = useState<'choose' | 'passphrase'>('choose');
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void passkeysSupported().then(setPasskey);
  }, []);

  const strength = pass.length >= 16 ? 'strong' : pass.length >= 10 ? 'fair' : pass.length ? 'weak' : '';

  return (
    <Dialog open onClose={onClose} title="Before we keep this, let’s lock it to you." eyebrow="Your private vault" className="lock-setup">
      {mode === 'choose' ? (
        <div className="lock-setup__choices">
          <p className="muted">Everything you keep in ETERNALL is encrypted on this device. Choose how you’ll open it.</p>
          {passkey && (
            <button type="button" className="lock-choice is-recommended" disabled={busy} onClick={() => onCreate({ kind: 'passkey' })}>
              <Icon name="lock" size={20} />
              <span className="lock-choice__text">
                <strong>Use a passkey</strong>
                <span>Face ID, Touch ID, Windows Hello or a security key. Recommended.</span>
              </span>
            </button>
          )}
          <button type="button" className={`lock-choice ${passkey ? '' : 'is-recommended'}`} disabled={busy} onClick={() => setMode('passphrase')}>
            <Icon name="pen" size={20} />
            <span className="lock-choice__text">
              <strong>Set a passphrase</strong>
              <span>A few words only you know. Asked when you come back.</span>
            </span>
          </button>
          <button type="button" className="lock-choice lock-choice--quiet" disabled={busy} onClick={() => onCreate({ kind: 'device' })}>
            <Icon name="arrow" size={20} />
            <span className="lock-choice__text">
              <strong>Skip for now</strong>
              <span>Encrypted with a key kept on this device. Protects against copying your data off it, not against someone using this browser.</span>
            </span>
          </button>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <form
          className="editor-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (pass.length < 6) return setFieldError('Use at least 6 characters — longer is much stronger.');
            if (pass !== again) return setFieldError('The two passphrases don’t match.');
            setFieldError(null);
            onCreate({ kind: 'passphrase', passphrase: pass });
          }}
        >
          <TextField label="Passphrase" type="password" autoComplete="new-password" value={pass} autoFocus onChange={(e) => setPass(e.target.value)} hint={strength ? `Strength: ${strength}. Four or more ordinary words make a strong passphrase.` : 'Four or more ordinary words make a strong passphrase.'} />
          <TextField label="Type it again" type="password" autoComplete="new-password" value={again} error={fieldError ?? error ?? undefined} onChange={(e) => setAgain(e.target.value)} />
          <div className="lock-setup__actions">
            <Button variant="quiet" onClick={() => setMode('choose')}>
              Back
            </Button>
            <Button variant="primary" type="submit" busy={busy}>
              Lock my vault
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
