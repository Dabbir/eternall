import type { RecordStore, VaultRecord } from '@eternall/vault';

/**
 * Phase 1 development store: plaintext records in localStorage.
 * Replaced by the encrypted IndexedDB store in Phase 2 (docs/PRIVACY.md §3).
 */
export const PLAIN_KEY = 'eternall:vault:plain';

export function createLocalStore(storage: Storage = window.localStorage): RecordStore {
  const read = (): Record<string, VaultRecord> => {
    try {
      const raw = storage.getItem(PLAIN_KEY);
      return raw ? (JSON.parse(raw) as Record<string, VaultRecord>) : {};
    } catch {
      return {};
    }
  };
  return {
    load: async () => Object.values(read()),
    write: async (records) => {
      const all = read();
      for (const r of records) all[r.key] = r;
      storage.setItem(PLAIN_KEY, JSON.stringify(all));
    },
    clear: async () => storage.removeItem(PLAIN_KEY),
  };
}
