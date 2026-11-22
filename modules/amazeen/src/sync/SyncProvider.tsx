import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { createHttpTransport } from './client';
import { createSyncController } from './controller';
import type { JoinResult, SyncStatus } from './controller';
import { createIdbStateStore } from './state';

export interface SyncApi {
  status: SyncStatus;
  /** Sync needs IndexedDB and a service to talk to. */
  supported: boolean;
  /** Start syncing this archive. Resolves with the key to show the person (once). Rejects if the service can't be reached. */
  setup: () => Promise<string>;
  join: (key: string) => Promise<JoinResult>;
  syncNow: () => Promise<void>;
  /** Forget the connection on this device; the cloud copy stays. */
  disconnect: () => Promise<void>;
  /** Delete the cloud copy and disconnect. */
  deleteCloud: () => Promise<void>;
  /** The key, for "show my key" on a connected device. */
  keyText: () => string | null;
}

const SyncContext = createContext<SyncApi | null>(null);
const POLL_MS = 60_000;

/**
 * Connects the archive to the sync controller: starts it, feeds it the latest data, applies what
 * other devices send, and triggers a round when it makes sense (a local change, the tab coming
 * back, the network returning, and once a minute while visible).
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { data, mergeRemote } = useStore();
  const dataRef = useRef(data);
  const mergeRef = useRef(mergeRemote);
  useLayoutEffect(() => {
    dataRef.current = data;
    mergeRef.current = mergeRemote;
  });

  // The callbacks below read the refs only when sync actually runs (never during render).
  // oxlint-disable-next-line react/refs
  const [controller] = useState(() =>
    createSyncController({
      stateStore: createIdbStateStore(),
      makeTransport: (secret) => createHttpTransport(secret),
      getData: () => dataRef.current,
      applyRemote: (incoming) => mergeRef.current(incoming),
    }),
  );
  const status = useSyncExternalStore(controller.subscribe, controller.getStatus, controller.getStatus);

  useEffect(() => {
    void controller.start();
  }, [controller]);

  // A local change: sync soon, after a pause for further typing. The data fields are the trigger,
  // not values the effect reads.
  useEffect(() => {
    controller.schedule();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [controller, data.entries, data.tombstones, data.overrides, data.magazine, data.metaUpdatedAt]);

  useEffect(() => {
    const now = (): void => void controller.syncNow();
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') now();
    };
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') now();
    }, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', now);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', now);
    };
  }, [controller]);

  const supported = typeof indexedDB !== 'undefined';
  const api = useMemo<SyncApi>(
    () => ({
      status,
      supported,
      setup: () => controller.setup(),
      join: (key) => controller.join(key),
      syncNow: () => controller.syncNow(),
      disconnect: () => controller.disconnect(),
      deleteCloud: () => controller.deleteCloud(),
      keyText: () => controller.keyText(),
    }),
    [controller, status, supported],
  );
  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApi {
  const api = useContext(SyncContext);
  if (!api) throw new Error('useSync must be used inside <SyncProvider>.');
  return api;
}
