import { decryptRecord, encryptRecord, opaqueRid, VaultCryptoError, type VaultKeys } from './crypto';
import type { VaultDb, WireRecord } from './idb';
import type { VaultRecord } from './records';
import type { RecordStore } from './store';

export class VaultLockedError extends Error {
  override name = 'VaultLockedError';
}

export interface EncryptedStore extends RecordStore {
  /** Ciphertext as stored (for encrypted export and sync). */
  wire(): Promise<WireRecord[]>;
  /** Records that failed to decrypt on the last load (tampered or corrupt). */
  readonly unreadable: number;
  lock(): void;
  readonly keys: VaultKeys | null;
  /** Merge ciphertext from sync: newest wins per rid, a live record beats a deletion on a tie. Returns the winners. */
  mergeWire(records: readonly WireRecord[]): Promise<WireRecord[]>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  /** Replace every record (key rotation). */
  replaceAll(records: readonly VaultRecord[]): Promise<void>;
}

/**
 * Records at rest, encrypted one by one (docs/PRIVACY.md §3). The logical key lives inside the
 * ciphertext; the store only ever sees an opaque rid, a timestamp, a deletion flag and the blob.
 */
export function createEncryptedStore(db: VaultDb, initialKeys: VaultKeys): EncryptedStore {
  let keys: VaultKeys | null = initialKeys;
  let unreadable = 0;
  const need = () => {
    if (!keys) throw new VaultLockedError('The vault is locked.');
    return keys;
  };

  const encode = async (k: VaultKeys, r: VaultRecord): Promise<WireRecord> => {
    const rid = await opaqueRid(k, r.key);
    return { rid, updatedAt: r.updatedAt, deleted: r.deleted, blob: await encryptRecord(k, rid, { key: r.key, value: r.deleted ? null : r.value }) };
  };

  return {
    get keys() {
      return keys;
    },
    get unreadable() {
      return unreadable;
    },
    async load() {
      const k = need();
      const out: VaultRecord[] = [];
      unreadable = 0;
      for (const w of await db.allRecords()) {
        try {
          const { key, value } = (await decryptRecord(k, w.rid, w.blob)) as { key: string; value: unknown };
          if (typeof key !== 'string' || (await opaqueRid(k, key)) !== w.rid) throw new VaultCryptoError('Record id mismatch.');
          out.push({ key, updatedAt: w.updatedAt, deleted: w.deleted, value });
        } catch {
          unreadable++;
        }
      }
      return out;
    },
    async write(records) {
      const k = need();
      await db.putRecords(await Promise.all(records.map((r) => encode(k, r))));
    },
    clear: () => db.clearRecords(),
    wire: () => db.allRecords(),
    async mergeWire(incoming) {
      const local = new Map((await db.allRecords()).map((w) => [w.rid, w]));
      const winners = incoming.filter((r) => {
        const cur = local.get(r.rid);
        if (!cur) return true;
        if (r.updatedAt !== cur.updatedAt) return r.updatedAt > cur.updatedAt;
        return cur.deleted && !r.deleted;
      });
      if (winners.length) await db.putRecords(winners);
      return winners;
    },
    getMeta: (key) => db.getMeta(key),
    setMeta: (key, value) => db.setMeta(key, value),
    async replaceAll(records) {
      const k = need();
      const wire = await Promise.all(records.map((r) => encode(k, r)));
      await db.clearRecords();
      await db.putRecords(wire);
    },
    lock() {
      keys = null;
    },
  };
}
