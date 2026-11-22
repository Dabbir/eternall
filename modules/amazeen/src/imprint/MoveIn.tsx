import { useEffect, useMemo, useRef, useState } from 'react';
import { mergeData } from '../domain/backup';
import { parseAppData } from '../domain/storage';
import { createVaultAdapter, readFromVault, type VaultLike } from './vaultAdapter';
import styles from './MoveIn.module.css';
import { importWithSyncKey } from './legacyImport';

/**
 * Where an existing AMAZEEN journal moves into ETERNALL (docs/FLOWS.md F15). AMAZEEN v1.5 opens this page in a
 * popup and hands its archive over with postMessage; only allow-listed origins are trusted, with a one-time nonce.
 */
export const AMAZEEN_ORIGINS: readonly string[] = (import.meta.env.VITE_AMAZEEN_ORIGINS ?? 'https://amazeen.app')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);


type State = { step: 'waiting' } | { step: 'done'; added: number; updated: number } | { step: 'error'; message: string } | { step: 'no-opener' };

export function MoveIn({ vault, onOpenDesk }: { vault: VaultLike; onOpenDesk(): void }) {
  const nonce = useMemo(() => crypto.randomUUID(), []);
  const [state, setState] = useState<State>(() => (window.opener ? { step: 'waiting' } : { step: 'no-opener' }));
  const handled = useRef(false);

  useEffect(() => {
    const opener = window.opener as Window | null;
    if (!opener) return;
    for (const origin of AMAZEEN_ORIGINS) opener.postMessage({ type: 'eternall:ready', nonce }, origin);
    const onMessage = async (e: MessageEvent) => {
      if (!AMAZEEN_ORIGINS.includes(e.origin)) return;
      const msg = e.data as { type?: string; nonce?: string; archive?: unknown };
      if (msg?.type !== 'amazeen:archive' || msg.nonce !== nonce || handled.current) return;
      handled.current = true;
      try {
        const incoming = parseAppData(typeof msg.archive === 'string' ? JSON.parse(msg.archive) : msg.archive).data;
        const merged = mergeData(readFromVault(vault), incoming);
        await createVaultAdapter(vault).save(merged.data);
        await vault.flush();
        opener.postMessage({ type: 'eternall:done', nonce, added: merged.added, updated: merged.updated }, e.origin);
        setState({ step: 'done', added: merged.added, updated: merged.updated });
      } catch (err) {
        handled.current = false;
        const message = err instanceof Error ? err.message : 'That archive couldn’t be read.';
        opener.postMessage({ type: 'eternall:error', nonce, message }, e.origin);
        setState({ step: 'error', message });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [nonce, vault]);

  return (
    <section className={styles.page} aria-live="polite">
      <p className={styles.kicker}>Moving house</p>
      {state.step === 'waiting' && (
        <>
          <h1 className={styles.title}>Waiting for your journal…</h1>
          <p className={styles.text}>Keep the AMAZEEN window open. Your issues arrive here, are encrypted in your ETERNALL vault, and nothing passes through any server.</p>
        </>
      )}
      {state.step === 'done' && (
        <>
          <h1 className={styles.title}>Your journal has moved in.</h1>
          <p className={styles.text}>
            {state.added} {state.added === 1 ? 'piece' : 'pieces'} arrived{state.updated ? `, ${state.updated} updated` : ''}. Same magazine, same shelf — now kept in your encrypted vault.
          </p>
          <button type="button" className={styles.button} onClick={onOpenDesk}>
            Go to the desk
          </button>
        </>
      )}
      {state.step === 'error' && (
        <>
          <h1 className={styles.title}>That didn’t come through.</h1>
          <p className={styles.text}>{state.message} You can also export a backup from AMAZEEN’s Office and import it here in the Office.</p>
        </>
      )}
      {state.step === 'no-opener' && (
        <>
          <h1 className={styles.title}>Bring your AMAZEEN journal</h1>
          <SyncKeyForm vault={vault} onDone={(added, updated) => setState({ step: 'done', added, updated })} />
          <ol className={styles.steps}>
            <li>Open AMAZEEN where you write today and go to the Office.</li>
            <li>Choose <strong>Move to ETERNALL</strong>. This page opens and your journal arrives in one step.</li>
            <li>Or export a backup there, then come back and use <strong>Import</strong> in the Office here.</li>
          </ol>
          <button type="button" className={styles.button} onClick={onOpenDesk}>
            Back to AMAZEEN
          </button>
        </>
      )}
    </section>
  );
}

function SyncKeyForm({ vault, onDone }: { vault: VaultLike; onDone(added: number, updated: number): void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        void importWithSyncKey(vault, key)
          .then((r) => onDone(r.added, r.updated))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'That didn’t work.'))
          .finally(() => setBusy(false));
      }}
    >
      <label className={styles.label} htmlFor="amazeen-sync-key">
        Used AMAZEEN sync? Enter your sync key
      </label>
      <input id="amazeen-sync-key" className={styles.input} value={key} autoComplete="off" spellCheck={false} placeholder="K7QF-2M9T-…" onChange={(e) => setKey(e.target.value)} aria-describedby={error ? 'amazeen-sync-err' : undefined} />
      {error && (
        <p id="amazeen-sync-err" className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={!key || busy}>
        {busy ? 'Bringing it over…' : 'Bring my journal'}
      </button>
    </form>
  );
}
