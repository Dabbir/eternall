import { metaStamp } from '../domain/backup';
import { parseEntry } from '../domain/entries';
import { parseMagazine } from '../domain/storage';
import type { AppData, Entry, IssueOverride } from '../domain/types';
import { decryptRecord, encryptRecord } from './crypto';
import type { Keys } from './crypto';
import type { WireRecord } from './protocol';

/**
 * Translates between an archive and sync records. An entry is `e:<id>`, a deleted entry is a
 * tombstone under the same id, and the masthead/cover settings are the single record `meta`.
 */
export const META_RID = 'meta';
export const entryRid = (id: string): string => `e:${id}`;

export interface LocalRecord {
  rid: string;
  /** ISO time this record last changed. Compared to what we last sent to decide what to push. */
  stamp: string;
  kind: 'entry' | 'tombstone' | 'meta';
}

/** Every record the local archive would contribute, with its change time. */
export function localRecords(data: AppData): LocalRecord[] {
  const out: LocalRecord[] = data.entries.map((e) => ({ rid: entryRid(e.id), stamp: e.updatedAt, kind: 'entry' as const }));
  for (const [id, at] of Object.entries(data.tombstones)) out.push({ rid: entryRid(id), stamp: at, kind: 'tombstone' });
  if (data.magazine) out.push({ rid: META_RID, stamp: metaStamp(data), kind: 'meta' });
  return out;
}

interface MetaPayload {
  magazine: AppData['magazine'];
  overrides: Readonly<Record<string, IssueOverride>>;
}

export async function encodeLocal(keys: Keys, data: AppData, local: LocalRecord): Promise<WireRecord> {
  if (local.kind === 'tombstone') return { rid: local.rid, updatedAt: local.stamp, deleted: true, blob: null };
  if (local.kind === 'meta') {
    const payload: MetaPayload = { magazine: data.magazine, overrides: data.overrides };
    return { rid: META_RID, updatedAt: local.stamp, deleted: false, blob: await encryptRecord(keys, META_RID, payload) };
  }
  const entry = data.entries.find((e) => entryRid(e.id) === local.rid);
  if (!entry) throw new Error('Record vanished while syncing.');
  return { rid: local.rid, updatedAt: local.stamp, deleted: false, blob: await encryptRecord(keys, local.rid, entry) };
}

export interface Decoded {
  /** The remote side as an archive, ready for `mergeData(..., { meta: 'newest' })`. */
  incoming: AppData;
  /** The change time of every record we understood, by rid. */
  stamps: Record<string, string>;
  /** Records that couldn't be decrypted or didn't validate (damaged, or from a newer app). */
  skipped: number;
}

export async function decodeRemote(keys: Keys, records: readonly WireRecord[]): Promise<Decoded> {
  const entries: Entry[] = [];
  const tombstones: Record<string, string> = {};
  const stamps: Record<string, string> = {};
  let magazine: AppData['magazine'] = null;
  let overrides: Record<string, IssueOverride> = {};
  let metaUpdatedAt: string | undefined;
  let skipped = 0;

  for (const record of records) {
    try {
      if (record.deleted) {
        if (!record.rid.startsWith('e:')) throw new Error('only entries can be deleted');
        tombstones[record.rid.slice(2)] = record.updatedAt;
        stamps[record.rid] = record.updatedAt;
        continue;
      }
      if (record.blob === null) throw new Error('no data');
      const plain = await decryptRecord(keys, record.rid, record.blob);
      if (record.rid === META_RID) {
        const meta = plain as Partial<MetaPayload> | null;
        magazine = parseMagazine(meta?.magazine);
        overrides = meta?.overrides && typeof meta.overrides === 'object' ? { ...meta.overrides } : {};
        metaUpdatedAt = record.updatedAt;
      } else {
        const entry = parseEntry(plain);
        if (!entry || entryRid(entry.id) !== record.rid) throw new Error('entry does not match its record');
        entries.push(entry);
      }
      stamps[record.rid] = record.updatedAt;
    } catch {
      skipped += 1;
    }
  }

  const incoming: AppData = {
    version: 2,
    magazine,
    entries,
    tombstones,
    overrides,
    ...(metaUpdatedAt ? { metaUpdatedAt } : {}),
  };
  return { incoming, stamps, skipped };
}
