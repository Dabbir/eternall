import { useRef, useState } from 'react';
import { plural, type FieldErrors, type HouseProfile, type ImprintDefinition } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, Segmented, TextField, useToast } from '@eternall/ui';
import { isSealedArchive, openSealedArchive, useVault, type SealedArchive, type VaultRecord } from '@eternall/vault';
import { SecuritySettings, exportSealed } from '../../vault/SecuritySettings';
import { useLock } from '../../vault/lockContext';
import { LIMITS, PROFILE_PATH, validateProfile, type ProfileInput, type ThemePreference } from '../domain/house';
import { useSettings } from '../../shell/hooks';
import { linkProps } from '../../shell/router';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Paper' },
  { value: 'dark', label: 'Night' },
];

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

/** Parse an exported archive (records with tombstones). Throws a readable Error. */
export function parseArchiveFile(text: string): VaultRecord[] {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('That file is too large to be an ETERNALL archive.');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  const obj = json as { app?: unknown; format?: unknown; records?: unknown };
  if (obj?.app !== 'ETERNALL' || obj.format !== 'records/1' || !Array.isArray(obj.records)) throw new Error('That isn’t an ETERNALL archive.');
  return obj.records.filter(
    (r): r is VaultRecord =>
      typeof r === 'object' && r !== null && typeof (r as VaultRecord).key === 'string' && /^[a-z]+\/[a-z][a-z0-9-]*\/[A-Za-z0-9_-]{1,64}$/.test((r as VaultRecord).key) && typeof (r as VaultRecord).updatedAt === 'string' && typeof (r as VaultRecord).deleted === 'boolean',
  );
}

export function SettingsView({ enabled }: { enabled: readonly ImprintDefinition[] }) {
  const { profile, today } = useHouse();
  const vault = useVault();
  const toast = useToast();
  const [settings, updateSettings] = useSettings();
  const [pending, setPending] = useState<VaultRecord[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [erase, setErase] = useState<null | 'all' | ImprintDefinition>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lockApi = useLock();
  const [sealed, setSealed] = useState<SealedArchive | null>(null);

  const exportEncrypted = async () => {
    if (await exportSealed(lockApi)) toast({ message: 'Encrypted backup saved. Only your recovery key opens it.' });
    else toast({ message: 'Lock your vault first, then export an encrypted backup.', tone: 'error' });
  };

  const exportArchive = () => {
    const blob = new Blob([JSON.stringify({ app: 'ETERNALL', format: 'records/1', exportedAt: new Date().toISOString(), records: vault.snapshot() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eternall-${today}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ message: 'Plain backup exported. This file isn’t encrypted — keep it somewhere private.' });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* handled below */
      }
      if (isSealedArchive(json)) {
        setSealed(json);
        return;
      }
      setPending(parseArchiveFile(text));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Couldn’t read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const allImprints = enabled.length ? enabled : [];

  return (
    <div className="settings">
      <header className="page-head">
        <p className="eyebrow rise">Settings</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          Yours, <em>and only yours.</em>
        </h1>
        <p className="muted rise" style={{ ['--i' as string]: 2 }}>
          ETERNALL keeps everything on this device. No accounts, no servers, no tracking. Export a backup to keep it safe.
        </p>
      </header>

      <section className="settings-block rise" style={{ ['--i' as string]: 2 }} aria-labelledby="set-profile">
        <div className="settings-block__intro">
          <h2 id="set-profile" className="display">
            Your lifeline
          </h2>
          <p className="faint">Changing your birth date or horizon redraws every week.</p>
        </div>
        <div className="settings-block__body">
          {profile ? (
            <ProfileForm profile={profile} today={today} onSave={(p) => vault.collection<HouseProfile>(PROFILE_PATH).put(p)} />
          ) : (
            <p className="muted">
              You haven’t drawn your lifeline yet.{' '}
              <a className="link" {...linkProps('/begin')}>
                Add your birth date
              </a>{' '}
              to see every week of your life on one page.
            </p>
          )}
        </div>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 3 }} aria-labelledby="set-look">
        <div className="settings-block__intro">
          <h2 id="set-look" className="display">
            Appearance
          </h2>
          <p className="faint">Paper by day, night ink after dark — or let your system decide.</p>
        </div>
        <div className="settings-block__body settings-stack">
          <Segmented label="Theme" options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
          <label className="check">
            <input type="checkbox" checked={settings.flatPages} onChange={(e) => updateSettings({ flatPages: e.target.checked })} />
            <span className="check__box" aria-hidden="true" />
            Flat pages: never use 3D or immersive animation
          </label>
        </div>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 4 }} aria-labelledby="set-imprints">
        <div className="settings-block__intro">
          <h2 id="set-imprints" className="display">
            Imprints
          </h2>
          <p className="faint">Hide imprints you don’t use. Their data is kept until you erase it.</p>
        </div>
        <ul className="settings-block__body imprint-list">
          {allImprints.concat([]).map((d) => (
            <li key={d.id}>
              <span className="door__name" style={{ ['--c' as string]: d.accent.light, ['--c-dark' as string]: d.accent.dark }}>
                {d.name}
              </span>
              <span className="door__fn">{d.functionLine}</span>
              <Button variant="quiet" size="s" onClick={() => setErase(d)}>
                Erase data
              </Button>
            </li>
          ))}
          {settings.hidden.length > 0 && (
            <li>
              <Button variant="ghost" size="s" onClick={() => updateSettings({ hidden: [] })}>
                Show hidden imprints ({settings.hidden.length})
              </Button>
            </li>
          )}
        </ul>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 4 }} aria-labelledby="set-security">
        <div className="settings-block__intro">
          <h2 id="set-security" className="display">
            Security
          </h2>
          <p className="faint">Everything is encrypted on this device. Choose how it opens.</p>
        </div>
        <div className="settings-block__body">
          <SecuritySettings />
        </div>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 5 }} aria-labelledby="set-data">
        <div className="settings-block__intro">
          <h2 id="set-data" className="display">
            Your archive
          </h2>
          <p className="faint">{plural(vault.snapshot().filter((r) => !r.deleted).length, 'item')} kept.</p>
        </div>
        <div className="settings-block__body settings-actions">
          <Button variant="ghost" icon="download" onClick={() => void exportEncrypted()}>
            Export encrypted backup
          </Button>
          <Button variant="quiet" onClick={exportArchive}>
            Export plain JSON
          </Button>
          <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>
            Restore from backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json,.eternall" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          {importError && (
            <p className="field__error" role="alert">
              {importError}
            </p>
          )}
        </div>
      </section>

      <section className="settings-block settings-block--danger rise" style={{ ['--i' as string]: 6 }} aria-labelledby="set-erase">
        <div className="settings-block__intro">
          <h2 id="set-erase" className="display">
            Erase everything
          </h2>
          <p className="faint">Removes your lifeline and every imprint’s data from this device, including sealed letters.</p>
        </div>
        <div className="settings-block__body">
          <Button variant="danger" icon="trash" onClick={() => setErase('all')}>
            Erase this archive…
          </Button>
        </div>
      </section>

      {pending && (
        <Dialog
          open
          onClose={() => setPending(null)}
          title="Restore this backup?"
          eyebrow="Restore"
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const n = vault.merge(pending);
                  setPending(null);
                  toast({ message: n ? `Restored ${plural(n, 'item')}. Newer versions on this device were kept.` : 'Everything in that backup was already here.', tone: 'accent' });
                }}
              >
                Merge into my archive
              </Button>
            </>
          }
        >
          <p className="muted">
            This backup holds {plural(pending.filter((r) => !r.deleted).length, 'item')}. It will be merged: for each item, the newest version wins, and nothing newer on this device is overwritten.
          </p>
        </Dialog>
      )}

      {sealed && (
        <SealedImport
          archive={sealed}
          onClose={() => setSealed(null)}
          onRecords={(records, skipped) => {
            setSealed(null);
            setPending(records);
            if (skipped) toast({ message: `${plural(skipped, 'item')} in that backup couldn’t be read and will be skipped.`, tone: 'error' });
          }}
        />
      )}

      {erase && (
        <EraseDialog
          label={erase === 'all' ? 'everything' : erase.name}
          confirmWord={erase === 'all' ? (profile?.name ?? 'ERASE') : erase.name}
          onClose={() => setErase(null)}
          onErase={async () => {
            if (erase === 'all') {
              await lockApi.destroyAll();
            } else {
              vault.eraseCollections(erase.collections);
              toast({ message: `${erase.name} has been erased.` });
            }
            setErase(null);
          }}
        />
      )}
    </div>
  );
}

function ProfileForm({ profile, today, onSave }: { profile: HouseProfile; today: string; onSave(p: HouseProfile): void }) {
  const toast = useToast();
  const [form, setForm] = useState<ProfileInput>({ name: profile.name, birthDate: profile.birthDate, horizonYears: profile.horizonYears });
  const [errors, setErrors] = useState<FieldErrors<keyof ProfileInput>>({});
  const dirty = form.name !== profile.name || form.birthDate !== profile.birthDate || form.horizonYears !== profile.horizonYears;
  return (
    <form
      className="editor-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const r = validateProfile(form, today);
        if (!r.ok) {
          setErrors(r.errors);
          return;
        }
        onSave({ ...profile, ...r.value });
        setErrors({});
        toast({ message: 'Your lifeline has been redrawn.', tone: 'accent' });
      }}
    >
      <TextField label="Name" value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <div className="editor-form__row editor-form__row--2">
        <TextField label="Born" type="date" value={form.birthDate} max={today} error={errors.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        <TextField
          label="Horizon (years)"
          type="number"
          inputMode="numeric"
          min={LIMITS.minHorizon}
          max={LIMITS.maxHorizon}
          value={Number.isNaN(form.horizonYears) ? '' : form.horizonYears}
          error={errors.horizonYears}
          onChange={(e) => setForm({ ...form, horizonYears: e.target.valueAsNumber })}
        />
      </div>
      <div>
        <Button variant="primary" type="submit" disabled={!dirty}>
          Save
        </Button>
      </div>
    </form>
  );
}

function EraseDialog({ label, confirmWord, onClose, onErase }: { label: string; confirmWord: string; onClose(): void; onErase(): void }) {
  const [typed, setTyped] = useState('');
  const match = typed.trim().toLowerCase() === confirmWord.trim().toLowerCase();
  return (
    <Dialog
      open
      onClose={onClose}
      title="This can’t be undone."
      eyebrow={`Erase ${label}`}
      footer={
        <>
          <span className="spacer" />
          <Button variant="quiet" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" icon="trash" disabled={!match} type="submit" form="erase-form">
            Erase forever
          </Button>
        </>
      }
    >
      <form
        id="erase-form"
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (match) onErase();
        }}
      >
        <p className="muted">Sealed letters will be destroyed unread. If you might want any of this later, export a backup first.</p>
        <TextField label={`Type “${confirmWord}” to confirm`} value={typed} autoFocus autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
      </form>
    </Dialog>
  );
}

function SealedImport({ archive, onClose, onRecords }: { archive: SealedArchive; onClose(): void; onRecords(r: VaultRecord[], skipped: number): void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Open an encrypted backup" eyebrow="Restore">
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          void openSealedArchive(archive, key)
            .then(({ records, skipped }) => onRecords(records, skipped))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Couldn’t open that backup.'))
            .finally(() => setBusy(false));
        }}
      >
        <p className="muted">This backup is encrypted. Enter the recovery key of the vault it came from.</p>
        <TextField label="Recovery key" autoComplete="off" spellCheck={false} autoFocus value={key} error={error ?? undefined} onChange={(e) => setKey(e.target.value)} />
        <div>
          <Button variant="primary" type="submit" busy={busy} disabled={!key}>
            Open backup
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
