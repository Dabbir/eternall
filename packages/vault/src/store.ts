import type { VaultRecord } from './records';

/** Where records live at rest. Phase 1: memory/plain; Phase 2: encrypted IndexedDB. */
export interface RecordStore {
  load(): Promise<VaultRecord[]>;
  write(records: readonly VaultRecord[]): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryStore(initial: VaultRecord[] = []): RecordStore & { dump(): VaultRecord[] } {
  const map = new Map(initial.map((r) => [r.key, structuredClone(r)]));
  return {
    load: async () => [...map.values()].map((r) => structuredClone(r)),
    write: async (records) => {
      for (const r of records) map.set(r.key, structuredClone(r));
    },
    clear: async () => map.clear(),
    dump: () => [...map.values()],
  };
}
