import { decryptRecord, deriveVaultKeys, opaqueRid } from './crypto';
import type { WireRecord } from './idb';
import { KEY_PROBLEMS, parseKey } from './keyphrase';
import type { VaultRecord } from './records';

/**
 * The encrypted archive (`.eternall`, docs/FLOWS.md F13): the vault's ciphertext as stored,
 * decryptable only with that vault's recovery key. The default, and best, backup.
 */
export interface SealedArchive {
  app: 'ETERNALL';
  format: 'sealed/1';
  vaultId: string;
  exportedAt: string;
  records: WireRecord[];
}

export function sealArchive(vaultId: string, records: WireRecord[]): string {
  const archive: SealedArchive = { app: 'ETERNALL', format: 'sealed/1', vaultId, exportedAt: new Date().toISOString(), records };
  return JSON.stringify(archive);
}

export function isSealedArchive(v: unknown): v is SealedArchive {
  const o = v as Partial<SealedArchive> | null;
  return !!o && o.app === 'ETERNALL' && o.format === 'sealed/1' && typeof o.vaultId === 'string' && Array.isArray(o.records);
}

/** Decrypt a sealed archive with its recovery key. Unreadable records are skipped and counted. */
export async function openSealedArchive(archive: SealedArchive, recoveryKey: string): Promise<{ records: VaultRecord[]; skipped: number }> {
  const parsed = parseKey(recoveryKey);
  if (!parsed.ok) throw new Error(KEY_PROBLEMS[parsed.reason]);
  const keys = await deriveVaultKeys(parsed.bytes);
  if (keys.vaultId !== archive.vaultId) throw new Error('That recovery key doesn’t belong to this archive.');
  const records: VaultRecord[] = [];
  let skipped = 0;
  for (const w of archive.records) {
    try {
      if (typeof w?.rid !== 'string' || typeof w.blob !== 'string' || typeof w.updatedAt !== 'string') throw new Error('bad');
      const { key, value } = (await decryptRecord(keys, w.rid, w.blob)) as { key: string; value: unknown };
      if ((await opaqueRid(keys, key)) !== w.rid) throw new Error('rid');
      records.push({ key, updatedAt: w.updatedAt, deleted: !!w.deleted, value });
    } catch {
      skipped++;
    }
  }
  return { records, skipped };
}
