import { useRef, useState } from 'react';
import { LIMITS, type AppData, type ThemePreference } from '../../domain/types';
import { validateProfile, type FieldErrors, type ProfileInput } from '../../domain/validation';
import { plural } from '../../lib/format';
import { parseImport, serializeForExport } from '../../store/persistence';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { useToast } from '../../components/ui/Toast';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Paper' },
  { value: 'dark', label: 'Night' },
];

export function SettingsView() {
  const { profile, data, today, dispatch } = useProfileStore();
  const toast = useToast();
  const [form, setForm] = useState<ProfileInput>({ name: profile.name, birthDate: profile.birthDate, horizonYears: profile.horizonYears });
  const [errors, setErrors] = useState<FieldErrors<keyof ProfileInput>>({});
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = form.name !== profile.name || form.birthDate !== profile.birthDate || form.horizonYears !== profile.horizonYears;

  const saveProfile = () => {
    const r = validateProfile(form, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    dispatch({ type: 'profile/set', profile: { ...profile, ...r.value } });
    setErrors({});
    toast({ message: 'Your lifeline has been redrawn.', tone: 'seal' });
  };

  const exportArchive = () => {
    const blob = new Blob([serializeForExport(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eternall-${today}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ message: 'Archive exported. Keep it somewhere safe.' });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const parsed = parseImport(await file.text());
      if (!parsed.profile) throw new Error('That archive has no lifeline in it.');
      setPendingImport(parsed);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Couldn’t read that file.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="settings">
      <header className="page-head">
        <p className="eyebrow rise">Settings</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          Yours, <em>and only yours.</em>
        </h1>
        <p className="muted rise" style={{ ['--i' as string]: 2 }}>
          ETERNALL keeps everything in this browser. No accounts, no servers, no tracking — export a backup to keep it safe.
        </p>
      </header>

      <section className="settings-block rise" style={{ ['--i' as string]: 2 }} aria-labelledby="set-profile">
        <div className="settings-block__intro">
          <h2 id="set-profile" className="display">Your lifeline</h2>
          <p className="faint">Changing your birth date or horizon redraws every week.</p>
        </div>
        <form
          className="settings-block__body editor-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile();
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
            <Button variant="primary" type="submit" disabled={!dirty}>Save</Button>
          </div>
        </form>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 3 }} aria-labelledby="set-look">
        <div className="settings-block__intro">
          <h2 id="set-look" className="display">Appearance</h2>
          <p className="faint">Paper by day, night ink after dark — or let your system decide.</p>
        </div>
        <div className="settings-block__body">
          <Segmented label="Theme" options={THEMES} value={data.settings.theme} onChange={(theme) => dispatch({ type: 'settings/update', patch: { theme } })} />
        </div>
      </section>

      <section className="settings-block rise" style={{ ['--i' as string]: 4 }} aria-labelledby="set-data">
        <div className="settings-block__intro">
          <h2 id="set-data" className="display">Your archive</h2>
          <p className="faint">
            {plural(data.inscriptions.length, 'inscription')}, {plural(data.capsules.length, 'capsule')}, {plural(data.chapters.length, 'chapter')}.
          </p>
        </div>
        <div className="settings-block__body settings-actions">
          <Button variant="ghost" icon="download" onClick={exportArchive}>Export backup</Button>
          <Button variant="ghost" icon="upload" busy={importing} onClick={() => fileRef.current?.click()}>Restore from backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          {importError && <p className="field__error" role="alert">{importError}</p>}
        </div>
      </section>

      <section className="settings-block settings-block--danger rise" style={{ ['--i' as string]: 5 }} aria-labelledby="set-erase">
        <div className="settings-block__intro">
          <h2 id="set-erase" className="display">Erase everything</h2>
          <p className="faint">Removes your lifeline, memories, chapters and every sealed letter from this browser.</p>
        </div>
        <div className="settings-block__body">
          <Button variant="danger" icon="trash" onClick={() => setEraseOpen(true)}>Erase this archive…</Button>
        </div>
      </section>

      {pendingImport && (
        <Dialog
          open
          onClose={() => setPendingImport(null)}
          title="Restore this archive?"
          eyebrow="Restore"
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => setPendingImport(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  dispatch({ type: 'archive/replace', data: pendingImport });
                  setPendingImport(null);
                  toast({ message: 'Archive restored.', tone: 'seal' });
                }}
              >
                Replace my archive
              </Button>
            </>
          }
        >
          <p className="muted">
            This backup belongs to <strong>{pendingImport.profile?.name}</strong> and holds {plural(pendingImport.inscriptions.length, 'inscription')},{' '}
            {plural(pendingImport.capsules.length, 'capsule')} and {plural(pendingImport.chapters.length, 'chapter')}. It will replace everything currently in this browser.
          </p>
        </Dialog>
      )}

      {eraseOpen && <EraseDialog name={profile.name} onClose={() => setEraseOpen(false)} onErase={() => dispatch({ type: 'archive/erase' })} />}
    </div>
  );
}

function EraseDialog({ name, onClose, onErase }: { name: string; onClose: () => void; onErase: () => void }) {
  const [typed, setTyped] = useState('');
  const match = typed.trim().toLowerCase() === name.trim().toLowerCase();
  return (
    <Dialog
      open
      onClose={onClose}
      title="This can’t be undone."
      eyebrow="Erase everything"
      footer={
        <>
          <span className="spacer" />
          <Button variant="quiet" onClick={onClose}>Keep my archive</Button>
          <Button variant="danger" icon="trash" disabled={!match} onClick={onErase} type="submit" form="erase-form">Erase forever</Button>
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
        <TextField label={`Type “${name}” to confirm`} value={typed} autoFocus autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
      </form>
    </Dialog>
  );
}
