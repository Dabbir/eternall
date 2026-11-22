import type { AppData } from '../domain/types';
import { SyncApiError } from './client';
import type { SyncTransport } from './client';
import type { Keys } from './crypto';
import { LIMITS } from './protocol';
import type { WireRecord } from './protocol';
import { decodeRemote, encodeLocal, localRecords } from './records';
import type { SyncState } from './state';

export interface SyncDeps {
  transport: SyncTransport;
  keys: Keys;
  /** The archive as it is right now. */
  getData: () => AppData;
  /** Merge records from other devices into the archive (a single atomic step). */
  applyRemote: (incoming: AppData) => void;
  /** Called after each batch so progress survives a crash or closing the tab. */
  persist: (state: SyncState) => Promise<void>;
}

export interface SyncOutcome {
  pulled: number;
  pushed: number;
  /** Remote records we couldn't read. */
  skipped: number;
  state: SyncState;
}

/** Keep one push comfortably under the server's body limit. */
const BATCH_BYTES = 1_200_000;

/**
 * One round of sync: bring in what other devices changed, then send what we changed.
 *
 * Pulling never advances past what we've merged, and pushing never moves the pull cursor, so a
 * change another device makes while we're pushing is picked up by the next round, not lost.
 */
export async function syncOnce(deps: SyncDeps, start: SyncState): Promise<SyncOutcome> {
  const state: SyncState = { ...start, pushed: { ...start.pushed } };

  // ── Pull ──
  let pulled = 0;
  let skipped = 0;
  for (let more = true; more; ) {
    const page = await deps.transport.pull(state.cursor);
    if (page.records.length > 0) {
      const decoded = await decodeRemote(deps.keys, page.records);
      deps.applyRemote(decoded.incoming);
      skipped += decoded.skipped;
      pulled += page.records.length;
      // Remember what the cloud has. Where our copy is newer, leave it unmarked so it gets pushed;
      // that also stops a record the server adjusted (e.g. a far-future clock) from bouncing forever.
      const local = new Map(localRecords(deps.getData()).map((r) => [r.rid, r.stamp]));
      for (const [rid, stamp] of Object.entries(decoded.stamps)) {
        const mine = local.get(rid);
        if (mine === undefined || stamp >= mine) state.pushed[rid] = stamp;
      }
    }
    state.cursor = page.cursor;
    more = page.more && page.records.length > 0;
    await deps.persist(state);
  }

  // ── Push ──
  const data = deps.getData();
  const dirty = localRecords(data).filter((r) => state.pushed[r.rid] !== r.stamp);
  let pushed = 0;
  let batch: { wire: WireRecord; stamp: string }[] = [];
  let bytes = 0;
  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    await deps.transport.push(batch.map((b) => b.wire));
    for (const { wire, stamp } of batch) state.pushed[wire.rid] = stamp;
    pushed += batch.length;
    batch = [];
    bytes = 0;
    await deps.persist(state);
  };
  for (const record of dirty) {
    const wire = await encodeLocal(deps.keys, data, record);
    const size = (wire.blob?.length ?? 0) + 120;
    if (batch.length >= LIMITS.recordsPerPush || (batch.length > 0 && bytes + size > BATCH_BYTES)) await flush();
    batch.push({ wire, stamp: record.stamp });
    bytes += size;
  }
  await flush();

  state.lastSyncedAt = new Date().toISOString();
  await deps.persist(state);
  return { pulled, pushed, skipped, state };
}

/** Is it worth telling the person, or just try again later? */
export function describeFailure(err: unknown): { kind: 'offline' | 'auth' | 'error'; message: string } {
  if (err instanceof SyncApiError) {
    if (err.code === 'network') return { kind: 'offline', message: 'You’re offline. Changes will sync when you’re back.' };
    if (err.code === 'unauthorized') {
      return { kind: 'auth', message: 'This sync key no longer matches a journal in the cloud. It may have been deleted from another device.' };
    }
    if (err.code === 'quota') return { kind: 'error', message: 'The cloud copy has reached its storage limit.' };
    return { kind: 'error', message: err.message };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : 'Sync failed.' };
}

