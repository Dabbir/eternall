import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { weekKey } from '../domain/dates';
import { createId } from '../domain/entries';
import { compileIssues, weeklyStreak } from '../domain/issues';
import { createIdbAdapter, EMPTY_DATA } from '../domain/storage';
import type { LoadOutcome, SaveOutcome, StorageAdapter } from '../domain/storage';
import type { AppData, Entry, Issue, IssueOverride, Magazine } from '../domain/types';
import { clearAllDrafts } from './drafts';
import { requestPersistentStorage } from '../lib/persist';
import { useNow } from './now';
import { reducer } from './reducer';
import type { Action } from './reducer';

export interface Store {
  data: AppData;
  /** All issues, newest first. `issues[0]` is always the current week's issue. */
  issues: readonly Issue[];
  current: Issue;
  streak: number;
  loadStatus: LoadOutcome['status'];
  saveStatus: SaveOutcome;
  storageKind: StorageAdapter['kind'];
  setMagazine: (magazine: Magazine) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (entry: Entry) => void;
  deleteEntry: (id: string) => Entry | undefined;
  toggleStar: (id: string) => void;
  setOverride: (key: string, override: IssueOverride | null) => void;
  replaceData: (data: AppData) => void;
  /** Apply records that arrived from another device. */
  mergeRemote: (incoming: AppData) => void;
  markExported: () => void;
  /** Permanently remove the archive, legacy copies and drafts from this browser. */
  eraseAll: () => Promise<void>;
  /** Raw stored text, for rescue downloads when the archive can't be parsed. */
  readRawArchive: () => Promise<string | null>;
  findIssue: (key: string) => Issue | undefined;
  issueForEntry: (entry: Entry) => Issue | undefined;
}

const StoreContext = createContext<Store | null>(null);
const CHANNEL = 'amazeen';

interface ProviderProps {
  children: ReactNode;
  /** Shown while the archive loads from storage. */
  fallback?: ReactNode;
  /** Storage backend. Defaults to IndexedDB (with localStorage fallback). */
  adapter?: StorageAdapter;
}

type Boot = { phase: 'loading' } | { phase: 'ready'; status: LoadOutcome['status'] };

export function StoreProvider({ children, fallback = null, adapter: adapterProp }: ProviderProps) {
  const [adapter] = useState<StorageAdapter>(() => adapterProp ?? createIdbAdapter());
  const [data, dispatch] = useReducer(reducer, EMPTY_DATA);
  const [boot, setBoot] = useState<Boot>({ phase: 'loading' });
  const [saveStatus, setSaveStatus] = useState<SaveOutcome>({ ok: true });

  // Only user actions mark the archive dirty. Hydrating from storage never triggers a save, so
  // unreadable data stays untouched (and rescuable) until the person actually changes something.
  const dirty = useRef(false);
  const act = useCallback((action: Action) => {
    dirty.current = true;
    dispatch(action);
  }, []);

  // Identifies this store instance (one per tab) so it ignores its own broadcast messages.
  const [tabId] = useState(createId);
  const channel = useRef<BroadcastChannel | null>(null);

  // Load (and reload when another tab saves).
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const outcome = await adapter.load();
      if (cancelled) return;
      dispatch({ type: 'data/replace', data: outcome.data });
      setBoot({ phase: 'ready', status: outcome.status });
    };
    void load();

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CHANNEL);
      channel.current = bc;
      bc.addEventListener('message', (e: MessageEvent<{ type: string; from: string }>) => {
        if (e.data?.type === 'saved' && e.data.from !== tabId) void load();
      });
    }
    return () => {
      cancelled = true;
      channel.current?.close();
      channel.current = null;
    };
  }, [adapter, tabId]);

  // Persist after user changes. Writes are serialised and coalesced: at most one in flight,
  // and the latest state is always the one written last.
  const latest = useRef(data);
  const saving = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const askedPersistence = useRef(false);
  useEffect(() => {
    latest.current = data;
    if (!dirty.current) return; // hydration from storage or another tab: nothing to write
    dirty.current = false;
    const run = async (): Promise<void> => {
      do {
        queued.current = false;
        const snapshot = latest.current;
        const result = await adapter.save(snapshot);
        setSaveStatus(result);
        if (result.ok) {
          channel.current?.postMessage({ type: 'saved', from: tabId });
          setBoot((b) => (b.phase === 'ready' && b.status === 'corrupt' ? { phase: 'ready', status: 'ok' } : b));
          if (snapshot.magazine && !askedPersistence.current) {
            askedPersistence.current = true;
            void requestPersistentStorage();
          }
        }
      } while (queued.current);
      saving.current = null;
    };
    if (saving.current) queued.current = true;
    else saving.current = run();
  }, [data, adapter, tabId]);

  // Issues depend on the clock only through the current week, so recompile on week rollover, not every tick.
  const now = useNow();
  const [weekNow, setWeekNow] = useState(now);
  if (weekKey(weekNow) !== weekKey(now)) setWeekNow(now);
  const issues = useMemo(() => compileIssues(data, weekNow), [data, weekNow]);
  const streak = useMemo(() => weeklyStreak(data.entries, weekNow), [data.entries, weekNow]);

  const findIssue = useCallback((key: string) => issues.find((i) => i.key === key), [issues]);
  const issueForEntry = useCallback((entry: Entry) => findIssue(weekKey(new Date(entry.createdAt))), [findIssue]);

  const deleteEntry = useCallback(
    (id: string) => {
      const existing = latest.current.entries.find((e) => e.id === id);
      act({ type: 'entry/delete', id, at: new Date().toISOString() });
      return existing;
    },
    [act],
  );

  const eraseAll = useCallback(async () => {
    dirty.current = false;
    await saving.current;
    await adapter.clear();
    clearAllDrafts();
    dispatch({ type: 'data/reset' });
    setBoot({ phase: 'ready', status: 'empty' });
    setSaveStatus({ ok: true });
    channel.current?.postMessage({ type: 'saved', from: tabId });
  }, [adapter, tabId]);

  const store = useMemo<Store | null>(() => {
    if (boot.phase === 'loading') return null;
    const current = issues[0];
    if (!current) throw new Error('Invariant: the current issue always exists.');
    return {
      data,
      issues,
      current,
      streak,
      loadStatus: boot.status,
      saveStatus,
      storageKind: adapter.kind,
      setMagazine: (magazine) => act({ type: 'magazine/set', magazine, at: new Date().toISOString() }),
      addEntry: (entry) => act({ type: 'entry/add', entry }),
      updateEntry: (entry) => act({ type: 'entry/update', entry }),
      deleteEntry,
      toggleStar: (id) => act({ type: 'entry/toggleStar', id, now: new Date().toISOString() }),
      setOverride: (key, override) => act({ type: 'override/set', key, override, at: new Date().toISOString() }),
      replaceData: (next) => act({ type: 'data/replaceAll', data: next, at: new Date().toISOString() }),
      mergeRemote: (incoming) => act({ type: 'data/mergeRemote', incoming }),
      markExported: () => act({ type: 'backup/exported', at: new Date().toISOString() }),
      eraseAll,
      readRawArchive: () => adapter.readRaw(),
      findIssue,
      issueForEntry,
    };
  }, [boot, data, issues, streak, saveStatus, adapter, act, deleteEntry, eraseAll, findIssue, issueForEntry]);

  // False positive: the store's callbacks read refs only when invoked (in event handlers), never during render.
  // oxlint-disable-next-line react/refs
  if (!store) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>.');
  return store;
}
