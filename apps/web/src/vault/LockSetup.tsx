import { useEffect, useState } from 'react';
import { parseKey, passkeysSupported, KEY_PROBLEMS, type LockInput } from '@eternall/vault';
import { Button, Dialog, Icon, TextField } from '@eternall/ui';

/** F2: "Before we keep this, let's lock it to you." (docs/FLOWS.md) */
export function LockSetup({
  onCreate,
  onClose,
  busy,
  error,
  startAdopt = false,
}: {
  onCreate(input: LockInput, recoveryKey?: string): void;
  onClose(): void;
  busy: boolean;
  error: string | null;
  startAdopt?: boolean;
}) {
  const [passkey, setPasskey] = useState(false);
  const [mode, setMode] = useState<'choose' | 'passphrase' | 'adopt'>(startAdopt ? 'adopt' : 'choose');
  const [recovery, setRecovery] = useState<string | null>(null);
  const [keyText, setKeyText] = useState('');
  const make = (input: LockInput) => onCreate(input, recovery ?? undefined);
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void passkeysSupported().then(setPasskey);
  }, []);

  const strength = pass.length >= 16 ? 'strong' : pass.length >= 10 ? 'fair' : pass.length ? 'weak' : '';

  return (
    <Dialog open onClose={onClose} title="Before we keep this, let’s lock it to you." eyebrow="Your private vault" className="lock-setup">
      {mode === 'adopt' ? (
        <form
          className="editor-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = parseKey(keyText);
            if (!parsed.ok) return setFieldError(KEY_PROBLEMS[parsed.reason]);
            setFieldError(null);
            setRecovery(keyText);
            setMode('choose');
          }}
        >
          <p className="muted">Enter the recovery key of the vault you already use. This device gets its own lock; your records arrive through sync.</p>
          <TextField label="Recovery key" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} autoFocus value={keyText} error={fieldError ?? undefined} onChange={(e) => setKeyText(e.target.value)} />
          <div className="lock-setup__actions">
            <Button variant="quiet" onClick={() => setMode('choose')}>
              Back
            </Button>
            <Button variant="primary" type="submit">
              Continue
            </Button>
          </div>
        </form>
      ) : mode === 'choose' ? (
        <div className="lock-setup__choices">
          <p className="muted">{recovery ? 'Now choose how this device will open your vault.' : 'Everything you keep here is encrypted on this device. Choose how you’ll open it.'}</p>
          {passkey && (
            <button type="button" className="lock-choice is-recommended" disabled={busy} onClick={() => make({ kind: 'passkey' })}>
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
          <button type="button" className="lock-choice lock-choice--quiet" disabled={busy} onClick={() => make({ kind: 'device' })}>
            <Icon name="arrow" size={20} />
            <span className="lock-choice__text">
              <strong>Skip for now</strong>
              <span>Encrypted with a key kept on this device. Protects against copying your data off it, not against someone using this browser.</span>
            </span>
          </button>
          {!recovery && (
            <button type="button" className="lock-setup__link" onClick={() => setMode('adopt')}>
              I already have a vault on another device
            </button>
          )}
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
            make({ kind: 'passphrase', passphrase: pass });
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
