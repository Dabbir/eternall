import type { AppData, Entry, IssueOverride, Magazine } from '../domain/types';
import { EMPTY_DATA, type StorageAdapter } from '../domain/storage';

/** Where AMAZEEN keeps its records in the ETERNALL vault (encrypted at rest, docs/PRIVACY.md §3). */
export const ENTRY_PATH = 'amazeen/entry';
export const META_PATH = 'amazeen/meta';

export interface AmazeenMeta {
  id: 'main';
  magazine: Magazine | null;
  overrides: Record<string, IssueOverride>;
  metaUpdatedAt?: string;
  lastExportedAt?: string;
}

/** Minimal view of the vault this adapter needs (keeps AMAZEEN free of ETERNALL imports). */
export interface VaultLike {
  collection<T extends { id: string }>(path: string): { all(): readonly T[]; get(id: string): T | undefined; put(item: T): void; remove(id: string): T | undefined };
  eraseCollections(paths: readonly string[]): number;
  flush(): Promise<unknown>;
}

export function readFromVault(vault: Pick<VaultLike, 'collection'>): AppData {
  const meta = vault.collection<AmazeenMeta>(META_PATH).get('main');
  return {
    ...EMPTY_DATA,
    magazine: meta?.magazine ?? null,
    entries: [...vault.collection<Entry>(ENTRY_PATH).all()],
    overrides: meta?.overrides ?? {},
    ...(meta?.metaUpdatedAt ? { metaUpdatedAt: meta.metaUpdatedAt } : {}),
    ...(meta?.lastExportedAt ? { lastExportedAt: meta.lastExportedAt } : {}),
  };
}

/**
 * AMAZEEN's StorageAdapter, backed by the vault: one record per entry plus one for the masthead
 * and covers. Deletions become vault tombstones, which replaces AMAZEEN's own tombstone map.
 *
 * Only entries this adapter has loaded or saved can be deleted by a save: an entry written into the
 * vault meanwhile (by sync, or a house migration such as MARGINALIA's quotes) is never mistaken for
 * one the person removed. It appears the next time AMAZEEN loads.
 */
export function createVaultAdapter(vault: VaultLike): StorageAdapter {
  let known = new Set<string>();
  return {
    kind: 'indexeddb',
    async load() {
      const data = readFromVault(vault);
      known = new Set(data.entries.map((e) => e.id));
      return data.magazine || data.entries.length ? { status: 'ok', data, skipped: 0 } : { status: 'empty', data: EMPTY_DATA };
    },
    async save(data) {
      const entries = vault.collection<Entry>(ENTRY_PATH);
      const current = new Map(entries.all().map((e) => [e.id, e]));
      const keep = new Set<string>();
      for (const e of data.entries) {
        keep.add(e.id);
        const prev = current.get(e.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(e)) entries.put(e);
      }
      for (const id of current.keys()) if (!keep.has(id) && known.has(id)) entries.remove(id);
      known = keep;
      const meta: AmazeenMeta = {
        id: 'main',
        magazine: data.magazine,
        overrides: { ...data.overrides },
        ...(data.metaUpdatedAt ? { metaUpdatedAt: data.metaUpdatedAt } : {}),
        ...(data.lastExportedAt ? { lastExportedAt: data.lastExportedAt } : {}),
      };
      const metas = vault.collection<AmazeenMeta>(META_PATH);
      if (JSON.stringify(metas.get('main') ?? null) !== JSON.stringify(meta)) metas.put(meta);
      return { ok: true };
    },
    readRaw: async () => JSON.stringify(readFromVault(vault)),
    clear: async () => {
      vault.eraseCollections([ENTRY_PATH, META_PATH]);
      await vault.flush();
    },
  };
}
