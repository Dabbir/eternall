import { openKeyValueStore } from '../domain/idb';
import type { KeyValueStore } from '../domain/idb';
import type { Bytes } from './crypto';

/** Everything a device remembers about its connection to the cloud copy. */
export interface SyncState {
  /** The sync key's bytes: kept so "show my key" and "add a device" work. Never sent anywhere. */
  keyBytes: Bytes;
  /** Resume point for pulling. */
  cursor: number;
  /** For each record, the change time we last sent or received; what's newer locally gets pushed. */
  pushed: Record<string, string>;
  lastSyncedAt: string | null;
}

export interface SyncStateStore {
  load(): Promise<SyncState | null>;
  save(state: SyncState): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'sync';

function isState(value: unknown): value is SyncState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.keyBytes instanceof Uint8Array &&
    v.keyBytes.length === 16 &&
    typeof v.cursor === 'number' &&
    typeof v.pushed === 'object' &&
    v.pushed !== null &&
    (v.lastSyncedAt === null || typeof v.lastSyncedAt === 'string')
  );
}

/** Stored in IndexedDB beside the archive. Sync needs IndexedDB; without it, `load()` finds nothing. */
export function createIdbStateStore(open: () => Promise<KeyValueStore> = () => openKeyValueStore()): SyncStateStore {
  let kv: Promise<KeyValueStore | null> | null = null;
  const store = () => (kv ??= open().catch(() => null));
  return {
    async load() {
      const s = await store();
      if (!s) return null;
      try {
        const value = await s.get(KEY);
        return isState(value) ? value : null;
      } catch {
        return null;
      }
    },
    async save(state) {
      const s = await store();
      if (!s) throw new Error('Sync needs IndexedDB, which this browser isn’t allowing (private browsing?).');
      await s.set(KEY, state);
    },
    async clear() {
      const s = await store();
      await s?.delete(KEY).catch(() => undefined);
    },
  };
}

export function createMemoryStateStore(initial: SyncState | null = null): SyncStateStore {
  let state = initial;
  return {
    load: async () => state,
    save: async (s) => {
      state = structuredClone(s);
    },
    clear: async () => {
      state = null;
    },
  };
}
