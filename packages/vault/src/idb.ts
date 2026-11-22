/** A tiny promise wrapper over the vault's IndexedDB database: `meta` (key → value) and `records` (by rid). */
export const DB_NAME = 'eternall-vault';
const DB_VERSION = 1;

export interface WireRecord {
  rid: string;
  updatedAt: string;
  deleted: boolean;
  blob: string;
}

export interface VaultDb {
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  allRecords(): Promise<WireRecord[]>;
  putRecords(records: readonly WireRecord[]): Promise<void>;
  clearRecords(): Promise<void>;
  close(): void;
}

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
  });

export async function openVaultDb(factory: IDBFactory = globalThis.indexedDB, name = DB_NAME): Promise<VaultDb> {
  if (!factory) throw new Error('This browser has no IndexedDB, so ETERNALL can’t keep anything here.');
  const open = factory.open(name, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'rid' });
  };
  const db = await req(open);
  return {
    getMeta: async (key) => (await req(db.transaction('meta').objectStore('meta').get(key))) as never,
    setMeta: async (key, value) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put(value, key);
      await done(tx);
    },
    allRecords: () => req(db.transaction('records').objectStore('records').getAll()) as Promise<WireRecord[]>,
    putRecords: async (records) => {
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      for (const r of records) store.put(r);
      await done(tx);
    },
    clearRecords: async () => {
      const tx = db.transaction('records', 'readwrite');
      tx.objectStore('records').clear();
      await done(tx);
    },
    close: () => db.close(),
  };
}

export function deleteVaultDb(factory: IDBFactory = globalThis.indexedDB, name = DB_NAME): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = factory.deleteDatabase(name);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => resolve();
  });
}
