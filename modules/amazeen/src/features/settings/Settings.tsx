import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { backupStatus, mergeData, summarize } from '../../domain/backup';
import { formatDayMonth, formatMonthYear, weekKey } from '../../domain/dates';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import ui from '../../components/ui.module.css';
import { LIMITS } from '../../domain/entries';
import { sampleEntries } from '../../domain/sample';
import { DataFormatError, MAX_IMPORT_BYTES, parseAppData } from '../../domain/storage';
import type { AppData } from '../../domain/types';
import { downloadText } from '../../lib/download';
import { promptInstall, useInstallState } from '../../lib/install';
import { setPreference, useTheme } from '../../lib/theme';
import type { ThemePreference } from '../../lib/theme';
import { isStoragePersisted, requestPersistentStorage } from '../../lib/persist';
import { useDocumentTitle } from '../../state/hooks';
import { useNow } from '../../state/now';
import { Link, paths } from '../../router/router';
import { useStore } from '../../state/store';
import { useSync } from '../../sync/SyncProvider';
import { SyncSection } from '../sync/SyncSection';
import { useEmbedded } from '../../imprint/embedded';
import { LookSection } from '../../imprint/look/LookSection';
import { useExportArchive } from '../../state/useExportArchive';
import styles from './Settings.module.css';

const ERASE_WORD = 'ERASE';

function MastheadForm() {
  const { data, setMagazine } = useStore();
  const toast = useToast();
  const magazine = data.magazine;
  const [title, setTitle] = useState(magazine?.title ?? '');
  const [editor, setEditor] = useState(magazine?.editor ?? '');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const editorId = useId();
  const changed = title.trim() !== magazine?.title || editor.trim() !== magazine?.editor;

  const save = (e: FormEvent): void => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError('Your magazine needs a name.');
    if (t.length > LIMITS.magazineTitle) return setError(`Keep it under ${LIMITS.magazineTitle} characters.`);
    if (!magazine) return;
    setMagazine({ ...magazine, title: t, editor: editor.trim().slice(0, LIMITS.editor) || 'The Editor' });
    toast.push({ message: 'Masthead updated.' });
  };

  return (
    <form className={styles.form} onSubmit={save} noValidate>
      <div className={styles.mastPreview} aria-hidden="true">
        {title.trim() || 'Untitled'}
      </div>
      <div className={styles.fields}>
        <div>
          <label className={ui.label} htmlFor={titleId}>
            Magazine name
          </label>
          <input
            id={titleId}
            className={ui.input}
            value={title}
            maxLength={LIMITS.magazineTitle + 8}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${titleId}-err` : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
          {error && (
            <p id={`${titleId}-err`} className={ui.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <div>
          <label className={ui.label} htmlFor={editorId}>
            Byline
          </label>
          <input id={editorId} className={ui.input} value={editor} maxLength={LIMITS.editor} onChange={(e) => setEditor(e.target.value)} />
        </div>
      </div>
      <div>
        <button type="submit" className={`${ui.btn} ${ui.dark}`} disabled={!changed}>
          Save masthead
        </button>
      </div>
    </form>
  );
}

const APPEARANCE: { value: ThemePreference; label: string; note: string }[] = [
  { value: 'system', label: 'System', note: 'Follows this device' },
  { value: 'light', label: 'Day', note: 'Paper and ink' },
  { value: 'dark', label: 'Night', note: 'Ink and lamplight' },
];

function AppearanceSection() {
  const { preference, theme } = useTheme();
  return (
    <section className={styles.section} aria-labelledby="s-appearance">
      <div className={styles.sectionIntro}>
        <h2 id="s-appearance">Edition</h2>
        <p>Day or night edition. Press T anywhere to switch.</p>
      </div>
      <fieldset className={styles.editions}>
        <legend className="visually-hidden">Appearance</legend>
        {APPEARANCE.map((option) => (
          <label key={option.value} className={styles.edition} data-option={option.value}>
            <input
              type="radio"
              name="appearance"
              value={option.value}
              checked={preference === option.value}
              onChange={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                setPreference(option.value, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
              }}
            />
            <span className={styles.editionSwatch} aria-hidden="true" />
            <span className={styles.editionLabel}>{option.label}</span>
            <span className={styles.editionNote}>
              {option.value === 'system' ? `${option.note} · now ${theme === 'dark' ? 'night' : 'day'}` : option.note}
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

function InstallSection() {
  const state = useInstallState();
  const toast = useToast();
  if (state === 'unsupported') return null;
  return (
    <section className={styles.section} aria-labelledby="s-install">
      <div className={styles.sectionIntro}>
        <h2 id="s-install">Install</h2>
        <p>Put AMAZEEN on your home screen. It opens like an app, works offline, and the browser keeps your archive safer.</p>
      </div>
      <div className={styles.installBody}>
        {state === 'installed' && <p className={styles.status}>Installed. You’re reading the app version.</p>}
        {state === 'available' && (
          <button
            type="button"
            className={`${ui.btn} ${ui.primary}`}
            onClick={() => void promptInstall().then((ok) => ok && toast.push({ message: 'AMAZEEN is on your home screen.' }))}
          >
            Install AMAZEEN
          </button>
        )}
        {state === 'ios' && (
          <ol className={styles.steps}>
            <li>Tap the Share button in Safari.</li>
            <li>Choose “Add to Home Screen”.</li>
            <li>Open AMAZEEN from your home screen.</li>
          </ol>
        )}
      </div>
    </section>
  );
}

export default function Settings() {
  // Inside ETERNALL the house owns the theme, sync and install; their sections are hidden here.
  const embedded = useEmbedded();
  useDocumentTitle('Settings');
  const { data, replaceData, eraseAll, readRawArchive, loadStatus, storageKind } = useStore();
  const toast = useToast();
  const exportArchive = useExportArchive();
  const sync = useSync();
  const now = useNow();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void isStoragePersisted().then((value) => live && setPersisted(value));
    return () => {
      live = false;
    };
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<{ data: AppData; skipped: number; name: string } | null>(null);
  const [confirmSample, setConfirmSample] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseText, setEraseText] = useState('');
  const [wiping, setWiping] = useState(false);
  const eraseId = useId();

  const exportRescue = async (): Promise<void> => {
    const raw = await readRawArchive();
    if (raw) downloadText(raw, 'amazeen-rescue.json');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.push({ tone: 'error', message: 'That file is over 5 MB, which is too big to be an AMAZEEN archive.' });
      return;
    }
    setImporting(true);
    try {
      const parsed = parseAppData(JSON.parse(await file.text()));
      if (parsed.data.entries.length === 0) throw new DataFormatError('That archive has no pieces in it.');
      setPending({ ...parsed, name: file.name });
    } catch (err) {
      toast.push({
        tone: 'error',
        message: err instanceof DataFormatError ? err.message : 'That file isn’t valid JSON. Is it an AMAZEEN export?',
      });
    } finally {
      setImporting(false);
    }
  };

  const skippedNote = (n: number): string => (n ? `, skipped ${n} damaged` : '');
  const replaceWithImport = (): void => {
    if (!pending) return;
    replaceData({ ...pending.data, magazine: pending.data.magazine ?? data.magazine });
    toast.push({ message: `Replaced with ${pending.data.entries.length} pieces${skippedNote(pending.skipped)}.` });
    setPending(null);
  };
  const mergeImport = (): void => {
    if (!pending) return;
    const { data: merged, added, updated } = mergeData(data, pending.data);
    replaceData(merged);
    toast.push({ message: `Merged: ${added} new, ${updated} updated${skippedNote(pending.skipped)}.` });
    setPending(null);
  };
  const pendingSummary = pending ? summarize(pending.data, (iso) => weekKey(new Date(iso))) : null;
  const { daysSinceExport } = backupStatus(data, now, null);

  return (
    <div className={styles.settings}>
      <header className={styles.head}>
        <p className={styles.ornament} aria-hidden="true">
          ✦
        </p>
        <h1 className={styles.title}>
          The <em>Office</em>
        </h1>
        <p className={styles.sub}>Masthead, archive and house rules</p>
        <dl className={styles.staff}>
          <div>
            <dt>Publication</dt>
            <dd>{data.magazine?.title}</dd>
          </div>
          <div>
            <dt>Editor-in-chief</dt>
            <dd>{data.magazine?.editor || 'The Editor'}</dd>
          </div>
          <div>
            <dt>Founded</dt>
            <dd>{data.magazine ? formatMonthYear(new Date(data.magazine.createdAt)) : '—'}</dd>
          </div>
          <div>
            <dt>Circulation</dt>
            <dd>One</dd>
          </div>
        </dl>
      </header>

      <section className={styles.section} aria-labelledby="s-masthead">
        <div className={styles.sectionIntro}>
          <h2 id="s-masthead">Masthead</h2>
          <p>The name printed across every cover, and the byline on your features.</p>
        </div>
        <MastheadForm />
      </section>

      {embedded ? <LookSection /> : <AppearanceSection />}

      {!embedded && <SyncSection />}

      <section className={styles.section} aria-labelledby="s-archive">
        <div className={styles.sectionIntro}>
          <h2 id="s-archive">Archive</h2>
          <p>Everything lives in this browser only. Export regularly to keep a copy, or to move to another device.</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.action}>
            <div>
              <h3>Export archive</h3>
              <p>
                A JSON file with every piece, cover setting and your masthead.{' '}
                <span className={styles.status}>
                  {daysSinceExport === null
                    ? 'Never backed up.'
                    : daysSinceExport === 0
                      ? 'Last backup: today.'
                      : `Last backup: ${daysSinceExport} ${daysSinceExport === 1 ? 'day' : 'days'} ago.`}
                </span>
              </p>
            </div>
            <button type="button" className={ui.btn} onClick={exportArchive} disabled={data.entries.length === 0}>
              <Icon name="download" size={16} /> Export
            </button>
          </div>
          <div className={styles.action}>
            <div>
              <h3>Import archive</h3>
              <p>Merge in, or restore from, a previously exported file. You’ll see what’s inside before anything changes.</p>
            </div>
            <button type="button" className={ui.btn} onClick={() => fileRef.current?.click()} disabled={importing} aria-busy={importing}>
              <Icon name="upload" size={16} /> {importing ? 'Reading…' : 'Import'}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e)} />
          </div>
          <div className={styles.action}>
            <div>
              <h3>Sample archive</h3>
              <p>Six weeks of example issues, handy for seeing what AMAZEEN can do.</p>
            </div>
            <button type="button" className={ui.btn} onClick={() => (data.entries.length ? setConfirmSample(true) : replaceData({ ...data, entries: sampleEntries(), overrides: {} }))}>
              Load sample
            </button>
          </div>
          <div className={styles.action}>
            <div>
              <h3>This device</h3>
              <p>
                Saved in {storageKind === 'indexeddb' ? 'IndexedDB' : storageKind === 'localstorage' ? 'local storage (limited)' : 'memory only'}.{' '}
                <span className={styles.status}>
                  {persisted === true
                    ? 'Permanent storage is on: the browser won’t clear it to free space.'
                    : persisted === false
                      ? 'The browser may clear this data under storage pressure. Installing the app or allowing permanent storage helps.'
                      : 'Permanent storage isn’t supported in this browser. Export regularly.'}
                </span>
              </p>
            </div>
            {persisted === false && (
              <button
                type="button"
                className={ui.btn}
                onClick={() =>
                  void requestPersistentStorage().then((granted) => {
                    setPersisted(granted);
                    toast.push(
                      granted
                        ? { message: 'Permanent storage is on.' }
                        : { tone: 'error', message: 'The browser declined. Installing AMAZEEN usually lets it keep your data.' },
                    );
                  })
                }
              >
                Keep data permanently
              </button>
            )}
          </div>
          {loadStatus === 'corrupt' && (
            <div className={styles.action}>
              <div>
                <h3>Rescue unreadable data</h3>
                <p>Download the raw saved data that couldn’t be opened, before it’s overwritten.</p>
              </div>
              <button type="button" className={`${ui.btn} ${ui.danger}`} onClick={() => void exportRescue()}>
                Download raw data
              </button>
            </div>
          )}
        </div>
      </section>

      {!embedded && <InstallSection />}

      <section className={`${styles.section} ${styles.danger}`} aria-labelledby="s-danger">
        <div className={styles.sectionIntro}>
          <h2 id="s-danger">Stop the presses</h2>
          <p>Permanently erase every issue, piece and setting from this browser. If sync is on, this device disconnects; the cloud copy stays until you delete it in Sync.</p>
        </div>
        <div>
          <button type="button" className={`${ui.btn} ${ui.danger}`} onClick={() => setErasing(true)}>
            <Icon name="trash" size={16} /> Erase everything
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="s-keys">
        <div className={styles.sectionIntro}>
          <h2 id="s-keys">Shortcuts</h2>
          <p>For editors in a hurry.</p>
        </div>
        <dl className={styles.keys}>
          <div><dt><kbd>W</kbd></dt><dd>Write a story</dd></div>
          <div><dt><kbd>N</kbd></dt><dd>Jot a note</dd></div>
          <div><dt><kbd>/</kbd></dt><dd>Search the shelf</dd></div>
          <div><dt><kbd>T</kbd></dt><dd>Switch day / night edition</dd></div>
          <div><dt><kbd>G</kbd></dt><dd>Jump to any page while reading</dd></div>
          <div><dt><kbd>⌘</kbd> <kbd>↵</kbd></dt><dd>File the piece you’re writing</dd></div>
          <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Turn pages while reading</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>Close the reader or composer</dd></div>
        </dl>
      </section>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Import this archive?"
        actions={
          <>
            <button type="button" className={`${ui.btn} ${ui.quiet}`} onClick={() => setPending(null)}>
              Cancel
            </button>
            {data.entries.length > 0 && (
              <button type="button" className={`${ui.btn} ${ui.danger}`} onClick={replaceWithImport}>
                Replace everything
              </button>
            )}
            <button type="button" className={`${ui.btn} ${ui.dark}`} onClick={data.entries.length > 0 ? mergeImport : replaceWithImport}>
              {data.entries.length > 0 ? 'Merge in' : 'Restore'}
            </button>
          </>
        }
      >
        {pending && pendingSummary && (
          <>
            <dl className={styles.summary}>
              <div>
                <dt>File</dt>
                <dd>{pending.name}</dd>
              </div>
              <div>
                <dt>Pieces</dt>
                <dd>
                  {pendingSummary.entries}
                  {pending.skipped > 0 && ` (${pending.skipped} damaged, will be skipped)`}
                </dd>
              </div>
              <div>
                <dt>Issues</dt>
                <dd>{pendingSummary.issues}</dd>
              </div>
              {pendingSummary.first && pendingSummary.last && (
                <div>
                  <dt>Covers</dt>
                  <dd>
                    {formatDayMonth(new Date(pendingSummary.first))} {new Date(pendingSummary.first).getFullYear()} –{' '}
                    {formatDayMonth(new Date(pendingSummary.last))} {new Date(pendingSummary.last).getFullYear()}
                  </dd>
                </div>
              )}
            </dl>
            <p className={ui.dialogText}>
              {data.entries.length > 0
                ? `Merge keeps your ${data.entries.length} pieces and adds or updates from the file (newest edit wins). Replace swaps everything for the file.`
                : 'Your archive is empty, so this restores the file as-is.'}
            </p>
          </>
        )}
      </Dialog>

      <p className={styles.version}>
        AMAZEEN v{__APP_VERSION__} · Your data never leaves this device. <Link to={paths.privacy()}>Privacy</Link>
      </p>

      <ConfirmDialog
        open={confirmSample}
        title="Replace with sample issues?"
        message={`This swaps your ${data.entries.length} pieces for the sample archive. Export first if you want to keep them.`}
        confirmLabel="Load sample"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setConfirmSample(false)}
        onConfirm={() => {
          replaceData({ ...data, entries: sampleEntries(), overrides: {} });
          setConfirmSample(false);
          toast.push({ message: 'Sample archive loaded.' });
        }}
      />

      <Dialog
        open={erasing}
        onClose={() => {
          setErasing(false);
          setEraseText('');
        }}
        title="Erase everything?"
        actions={
          <>
            <button
              type="button"
              className={`${ui.btn} ${ui.quiet}`}
              onClick={() => {
                setErasing(false);
                setEraseText('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.danger}`}
              disabled={eraseText.trim().toUpperCase() !== ERASE_WORD || wiping}
              aria-busy={wiping}
              onClick={() => {
                // Keep the dialog up until storage has actually been wiped.
                setWiping(true);
                // Erasing this device must not be undone by the cloud copy pulling everything back.
                void sync.disconnect().then(eraseAll).catch(() => {
                  setWiping(false);
                  toast.push({ tone: 'error', message: 'Couldn’t erase everything. Please try again.' });
                });
              }}
            >
              {wiping ? 'Erasing…' : 'Erase permanently'}
            </button>
          </>
        }
      >
        <p className={ui.dialogText}>
          This deletes {data.entries.length} pieces across every issue. It can’t be undone. Type <strong>{ERASE_WORD}</strong> to confirm.
        </p>
        <label className="visually-hidden" htmlFor={eraseId}>
          Type {ERASE_WORD} to confirm
        </label>
        <input
          id={eraseId}
          className={`${ui.input} ${styles.eraseInput}`}
          value={eraseText}
          autoComplete="off"
          autoFocus
          onChange={(e) => setEraseText(e.target.value)}
        />
      </Dialog>
    </div>
  );
}
