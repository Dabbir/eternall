/**
 * A vault record is the unit of storage, encryption and sync.
 * `key` is the logical address `<imprint>/<collection>/<id>`; deletions are kept as tombstones
 * so a device that missed one can never resurrect the item (AMAZEEN's sync semantics).
 */
export interface VaultRecord {
  key: string;
  updatedAt: string;
  deleted: boolean;
  value: unknown;
}

export interface Entity {
  id: string;
}

/** Newest change wins; on an exact tie a live record beats a deletion. */
export function newer(a: VaultRecord, b: VaultRecord): VaultRecord {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  if (a.deleted !== b.deleted) return a.deleted ? b : a;
  return a;
}

/** Merge incoming records into a map. Returns the records that changed locally. */
export function mergeRecords(into: Map<string, VaultRecord>, incoming: Iterable<VaultRecord>): VaultRecord[] {
  const changed: VaultRecord[] = [];
  for (const rec of incoming) {
    const current = into.get(rec.key);
    const winner = current ? newer(current, rec) : rec;
    if (winner !== current) {
      into.set(rec.key, winner);
      changed.push(winner);
    }
  }
  return changed;
}

const PATH_RE = /^[a-z]+\/[a-z][a-z0-9-]*$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function recordKey(path: string, id: string): string {
  if (!PATH_RE.test(path)) throw new Error(`Invalid collection path "${path}"`);
  if (!ID_RE.test(id)) throw new Error(`Invalid record id "${id}"`);
  return `${path}/${id}`;
}

export function splitKey(key: string): { imprint: string; collection: string; id: string } | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  return { imprint: parts[0]!, collection: parts[1]!, id: parts[2]! };
}
