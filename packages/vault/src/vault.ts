import type { CollectionReader, DataReader } from '@eternall/core';
import { mergeRecords, recordKey, type Entity, type VaultRecord } from './records';
import type { RecordStore } from './store';

export interface Collection<T extends Entity> extends CollectionReader<T> {
  put(item: T): void;
  /** Removes an item and returns it (for undo). */
  remove(id: string): T | undefined;
}

export type SaveState = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' | 'locked' };

interface Options {
  now?: () => string;
  /** Delay before buffered writes are flushed to the store. */
  debounceMs?: number;
}

/**
 * The in-memory, decrypted working set of a person's archive, backed by a RecordStore.
 * Reads are synchronous (for React); writes update memory immediately and persist in batches.
 */
export class Vault implements DataReader {
  private records = new Map<string, VaultRecord>();
  private collections = new Map<string, Collection<Entity>>();
  private listeners = new Set<() => void>();
  private pending = new Map<string, VaultRecord>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;
  private saveState: SaveState = { ok: true };
  private readonly now: () => string;
  private readonly debounceMs: number;

  private constructor(
    private store: RecordStore,
    options: Options,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.debounceMs = options.debounceMs ?? 120;
  }

  static async open(store: RecordStore, options: Options = {}): Promise<Vault> {
    const vault = new Vault(store, options);
    mergeRecords(vault.records, await store.load());
    return vault;
  }

  /* ---------- subscription (useSyncExternalStore) ---------- */

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;
  getSaveState = (): SaveState => this.saveState;

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  /* ---------- collections ---------- */

  collection<T extends Entity>(path: string): Collection<T> {
    let col = this.collections.get(path);
    if (!col) {
      col = this.makeCollection(path);
      this.collections.set(path, col);
    }
    return col as unknown as Collection<T>;
  }

  private makeCollection(path: string): Collection<Entity> {
    const prefix = `${path}/`;
    let cacheVersion = -1;
    let cache: Entity[] = [];
    return {
      all: () => {
        if (cacheVersion !== this.version) {
          cache = [];
          for (const r of this.records.values()) if (!r.deleted && r.key.startsWith(prefix)) cache.push(r.value as Entity);
          cacheVersion = this.version;
        }
        return cache;
      },
      get: (id) => {
        const r = this.records.get(recordKey(path, id));
        return r && !r.deleted ? (r.value as Entity) : undefined;
      },
      put: (item) => this.write({ key: recordKey(path, item.id), updatedAt: this.stamp(path, item.id), deleted: false, value: structuredClone(item) }),
      remove: (id) => {
        const key = recordKey(path, id);
        const prev = this.records.get(key);
        if (!prev || prev.deleted) return undefined;
        this.write({ key, updatedAt: this.stamp(path, id), deleted: true, value: null });
        return prev.value as Entity;
      },
    };
  }

  /** A timestamp strictly newer than the record's current one, so rapid edits always win. */
  private stamp(path: string, id: string): string {
    const current = this.records.get(recordKey(path, id))?.updatedAt;
    let t = this.now();
    if (current && t <= current) t = new Date(Date.parse(current) + 1).toISOString();
    return t;
  }

  private write(rec: VaultRecord) {
    this.records.set(rec.key, rec);
    this.pending.set(rec.key, rec);
    this.schedule();
    this.emit();
  }

  /* ---------- persistence ---------- */

  private schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  async flush(): Promise<SaveState> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending.size) return this.saveState;
    const batch = [...this.pending.values()];
    this.pending.clear();
    try {
      await this.store.write(batch);
      this.setSaveState({ ok: true });
    } catch (e) {
      // Keep the batch so the next flush retries; nothing is lost from memory.
      for (const r of batch) if (!this.pending.has(r.key)) this.pending.set(r.key, r);
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      const locked = e instanceof Error && e.name === 'VaultLockedError';
      this.setSaveState({ ok: false, reason: quota ? 'quota' : locked ? 'locked' : 'unavailable' });
    }
    return this.saveState;
  }

  private setSaveState(s: SaveState) {
    if (s.ok === this.saveState.ok && (s.ok || (!this.saveState.ok && s.reason === this.saveState.reason))) return;
    this.saveState = s;
    this.emit();
  }

  hasPendingWrites(): boolean {
    return this.pending.size > 0;
  }

  /* ---------- bulk ---------- */

  /** All records including tombstones (for export and sync). */
  snapshot(): VaultRecord[] {
    return [...this.records.values()].map((r) => structuredClone(r));
  }

  /** Merge records from elsewhere (another tab, an import, sync). Newest wins. */
  merge(incoming: Iterable<VaultRecord>, options: { persist?: boolean } = {}): number {
    const changed = mergeRecords(this.records, incoming);
    if (changed.length) {
      if (options.persist !== false) {
        for (const r of changed) this.pending.set(r.key, r);
        this.schedule();
      }
      this.emit();
    }
    return changed.length;
  }

  /** Tombstone every record in the given collections. */
  eraseCollections(paths: readonly string[]): number {
    let n = 0;
    // Overwriting existing keys while iterating a Map is safe.
    for (const r of this.records.values()) {
      if (r.deleted) continue;
      if (paths.some((p) => r.key.startsWith(`${p}/`))) {
        const at = this.now() > r.updatedAt ? this.now() : new Date(Date.parse(r.updatedAt) + 1).toISOString();
        const tomb = { key: r.key, updatedAt: at, deleted: true, value: null };
        this.records.set(r.key, tomb);
        this.pending.set(r.key, tomb);
        n++;
      }
    }
    if (n) {
      this.schedule();
      this.emit();
    }
    return n;
  }

  /** Remove everything, including tombstones, from memory and the store. */
  async destroy(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.records.clear();
    await this.store.clear();
    this.emit();
  }
}
