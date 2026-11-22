import type { EncryptedStore } from './encryptedStore';
import type { WireRecord } from './idb';
import { SYNC_LIMITS, type ApiError, type PullResponse } from './protocol';

/** What a device remembers about its connection to the cloud copy (kept in the vault's IndexedDB meta). */
export interface SyncState {
  enabled: boolean;
  cursor: number;
  /** For each rid, the change time last sent or received. */
  pushed: Record<string, string>;
  lastSyncedAt: string | null;
}

export const EMPTY_SYNC: SyncState = { enabled: false, cursor: 0, pushed: {}, lastSyncedAt: null };
export const SYNC_META_KEY = 'sync';

export class SyncError extends Error {
  constructor(
    public code: ApiError['error'] | 'offline',
    message: string,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

/** The client side of `services/sync-worker` (same origin, bearer = the vault's auth secret). */
export class SyncApi {
  constructor(
    private authSecret: string,
    private base = '/api',
    private fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${path}`, {
        ...init,
        headers: { authorization: `Bearer ${this.authSecret}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
      });
    } catch {
      throw new SyncError('offline', 'You’re offline. Changes will sync when you’re back.');
    }
    const body = (await res.json().catch(() => ({}))) as T & Partial<ApiError>;
    if (!res.ok) throw new SyncError(body.error ?? 'server', body.message ?? 'The sync service didn’t answer.');
    return body;
  }

  register = (token: string) => this.call<{ created: boolean }>('/vault', { method: 'POST', body: JSON.stringify({ token }) });
  status = () => this.call<{ exists: boolean; active: boolean }>('/vault');
  unregister = () => this.call<{ deleted: boolean }>('/vault', { method: 'DELETE' });
  pull = (since: number) => this.call<PullResponse>(`/sync?since=${since}`);
  push = (records: WireRecord[]) => this.call<{ cursor: number }>('/sync', { method: 'POST', body: JSON.stringify({ records }) });
}

/**
 * One round of sync: pull everything after our cursor (merging ciphertext newest-wins), then push
 * what changed here since we last sent it. Records stay encrypted end to end; nothing is decrypted
 * to sync. Returns the new state and whether anything arrived (so the caller can reload the vault).
 */
export async function syncOnce(api: SyncApi, store: EncryptedStore, start: SyncState): Promise<{ state: SyncState; received: number; sent: number }> {
  const state: SyncState = { ...start, pushed: { ...start.pushed } };
  let received = 0;
  for (;;) {
    const page = await api.pull(state.cursor);
    const incoming = page.records.filter((r): r is typeof r & { blob: string } => typeof r.blob === 'string').map(({ seq: _seq, ...r }) => r as WireRecord);
    const winners = await store.mergeWire(incoming);
    received += winners.length;
    for (const r of page.records) state.pushed[r.rid] = r.updatedAt;
    state.cursor = page.cursor;
    if (!page.more) break;
  }
  const local = await store.wire();
  const due = local.filter((r) => !state.pushed[r.rid] || state.pushed[r.rid]! < r.updatedAt);
  let sent = 0;
  for (let i = 0; i < due.length; i += SYNC_LIMITS.recordsPerPush) {
    const batch = due.slice(i, i + SYNC_LIMITS.recordsPerPush);
    await api.push(batch);
    for (const r of batch) state.pushed[r.rid] = r.updatedAt;
    sent += batch.length;
  }
  state.lastSyncedAt = new Date().toISOString();
  return { state, received, sent };
}
