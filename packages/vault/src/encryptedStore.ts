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
    lock() {
      keys = null;
    },
  };
}
