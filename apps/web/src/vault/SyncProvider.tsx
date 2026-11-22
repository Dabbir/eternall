import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EMPTY_SYNC, SYNC_META_KEY, SyncApi, SyncError, syncOnce, useVault, type SyncState } from '@eternall/vault';
import { useLock } from './lockContext';

interface SyncApiValue {
  available: boolean;
  state: SyncState;
  busy: boolean;
  error: string | null;
  enable(token: string): Promise<void>;
  disable(deleteCloud: boolean): Promise<void>;
  syncNow(): Promise<void>;
}

const SyncContext = createContext<SyncApiValue | null>(null);

/**
 * Keeps this device's vault in step with its cloud copy (docs/FLOWS.md F9): on open, after each
 * save, every minute and when coming back online. Everything sent is ciphertext.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const vault = useVault();
  const { store } = useLock();
  const [state, setState] = useState<SyncState>(EMPTY_SYNC);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef(false);
  const api = useMemo(() => (store?.keys ? new SyncApi(store.keys.authSecret) : null), [store]);

  useEffect(() => {
    if (!store) return;
    void store.getMeta<SyncState>(SYNC_META_KEY).then((s) => s && setState(s));
  }, [store]);

  const save = useCallback(
    async (s: SyncState) => {
      setState(s);
      await store?.setMeta(SYNC_META_KEY, s);
    },
    [store],
  );

  const run = useCallback(async () => {
    if (!api || !store || running.current || !stateRef.current.enabled) return;
    running.current = true;
    setBusy(true);
    try {
      await vault.flush();
      const { state: next, received } = await syncOnce(api, store, stateRef.current);
      await save(next);
      if (received) vault.merge(await store.load(), { persist: false });
      setError(null);
    } catch (e) {
      setError(e instanceof SyncError ? e.message : 'Sync failed. Your data on this device is safe.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [api, store, vault, save]);

  useEffect(() => {
    if (!state.enabled) return;
    void run();
    let pending: number | null = null;
    const off = vault.onFlushed(() => {
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => void run(), 2000);
    });
    const id = window.setInterval(() => void run(), 60_000);
    const onOnline = () => void run();
    const onVisible = () => !document.hidden && void run();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      if (pending) window.clearTimeout(pending);
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.enabled, run, vault]);

  const value = useMemo<SyncApiValue>(
    () => ({
      available: !!api,
      state,
      busy,
      error,
      enable: async (token) => {
        if (!api) throw new Error('Lock your vault first.');
        await api.register(token);
        await save({ ...EMPTY_SYNC, enabled: true });
        stateRef.current = { ...EMPTY_SYNC, enabled: true };
        await run();
      },
      disable: async (deleteCloud) => {
        if (deleteCloud && api) await api.unregister().catch(() => undefined);
        await save(EMPTY_SYNC);
      },
      syncNow: run,
    }),
    [api, state, busy, error, save, run],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApiValue {
  const v = useContext(SyncContext);
  if (!v) throw new Error('useSync must be used inside <SyncProvider>');
  return v;
}
