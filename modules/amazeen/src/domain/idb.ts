/**
 * Minimal promise wrapper around IndexedDB: one database, one key/value object store.
 * Deliberately tiny; AMAZEEN stores a single archive document, not a query workload.
 */

const DB_NAME = 'amazeen';
const DB_VERSION = 1;
const STORE = 'kv';

export class IdbUnavailableError extends Error {
  override name = 'IdbUnavailableError';
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error ?? new Error('IndexedDB request failed')));
  });
}

export interface KeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Open (or create) the AMAZEEN database. Rejects with IdbUnavailableError where IndexedDB is missing or blocked. */
export async function openKeyValueStore(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<KeyValueStore> {
  if (!factory) throw new IdbUnavailableError('IndexedDB is not available in this browser.');
  let db: IDBDatabase;
  try {
    const open = factory.open(DB_NAME, DB_VERSION);
    open.addEventListener('upgradeneeded', () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    });
    db = await request(open);
  } catch (err) {
    throw new IdbUnavailableError(err instanceof Error ? err.message : 'IndexedDB could not be opened.');
  }
  // Another tab upgrading the schema: close so it can proceed; we'll reopen on next load.
  db.addEventListener('versionchange', () => db.close());

  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
  const done = (t: IDBObjectStore): Promise<void> =>
    new Promise((resolve, reject) => {
      t.transaction.addEventListener('complete', () => resolve());
      t.transaction.addEventListener('error', () => reject(t.transaction.error ?? new Error('IndexedDB transaction failed')));
      t.transaction.addEventListener('abort', () => reject(t.transaction.error ?? new Error('IndexedDB transaction aborted')));
    });

  return {
    get: (key) => request(tx('readonly').get(key)),
    async set(key, value) {
      const store = tx('readwrite');
      store.put(value, key);
      await done(store);
    },
    async delete(key) {
      const store = tx('readwrite');
      store.delete(key);
      await done(store);
    },
  };
}
