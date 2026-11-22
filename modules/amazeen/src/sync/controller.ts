import type { AppData } from '../domain/types';
import { SyncApiError } from './client';
import type { SyncTransport } from './client';
import { deriveKeys } from './crypto';
import type { Keys } from './crypto';
import { describeFailure, syncOnce } from './engine';
import { generateKey, KEY_PROBLEMS, keyText as formatKeyText, parseKey } from './keyphrase';
import type { SyncState, SyncStateStore } from './state';

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'auth';

export interface SyncStatus {
  phase: SyncPhase;
  lastSyncedAt: string | null;
  /** What to tell the person when something's wrong. */
  message: string | null;
}

export interface ControllerDeps {
  stateStore: SyncStateStore;
  makeTransport: (authSecret: string) => SyncTransport;
  getData: () => AppData;
  applyRemote: (incoming: AppData) => void;
  /** Wait this long after a local change before syncing, so a burst of typing is one round. */
  debounceMs?: number;
}

export type JoinResult = { ok: true } | { ok: false; reason: string };

interface Connection {
  keys: Keys;
  transport: SyncTransport;
  state: SyncState;
}

/** Serialise sync across tabs of the same browser, where Web Locks exist. */
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request('amazeen-sync', fn) : fn();
}

/**
 * Owns the connection to the cloud copy: connecting, disconnecting, and running sync rounds one
 * at a time. It knows nothing about React; the provider wires it to the store.
 */
export function createSyncController(deps: ControllerDeps) {
  const debounceMs = deps.debounceMs ?? 2000;
  let connection: Connection | null = null;
  let status: SyncStatus = { phase: 'off', lastSyncedAt: null, message: null };
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<SyncStatus>): void => {
    status = { ...status, ...patch };
    listeners.forEach((l) => l());
  };

  async function connect(keyBytes: SyncState['keyBytes'], state?: SyncState): Promise<Connection> {
    const keys = await deriveKeys(keyBytes);
    const fresh: SyncState = state ?? { keyBytes, cursor: 0, pushed: {}, lastSyncedAt: null };
    connection = { keys, transport: deps.makeTransport(keys.authSecret), state: fresh };
    set({ phase: 'idle', lastSyncedAt: fresh.lastSyncedAt, message: null });
    return connection;
  }

  async function round(): Promise<void> {
    const conn = connection;
    if (!conn) return;
    set({ phase: 'syncing', message: null });
    try {
      await exclusive(async () => {
        // Another tab may have synced since we last looked: continue from the saved state.
        const saved = await deps.stateStore.load();
        const start = saved ?? conn.state;
        const outcome = await syncOnce(
          {
            transport: conn.transport,
            keys: conn.keys,
            getData: deps.getData,
            applyRemote: deps.applyRemote,
            persist: (s) => deps.stateStore.save(s),
          },
          start,
        );
        conn.state = outcome.state;
        set({
          phase: 'idle',
          lastSyncedAt: outcome.state.lastSyncedAt,
          message: outcome.skipped > 0 ? `${outcome.skipped} ${outcome.skipped === 1 ? 'piece' : 'pieces'} in the cloud couldn’t be read and were skipped.` : null,
        });
      });
    } catch (err) {
      const failure = describeFailure(err);
      set({ phase: failure.kind === 'offline' ? 'offline' : failure.kind === 'auth' ? 'auth' : 'error', message: failure.message });
    }
  }

  /** Run a round now, or after the one in progress. Never two at once. */
  function syncNow(): Promise<void> {
    if (!connection || status.phase === 'auth') return Promise.resolve();
    clearTimeout(timer);
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await round();
      } while (again && status.phase !== 'auth');
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    getStatus: () => status,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** The key to show on "show my key" / "add a device", or null when not connected. */
    keyText(): string | null {
      return connection ? formatKeyText(connection.state.keyBytes) : null;
    },

    /** Pick up a connection saved on this device. Call once at startup. */
    async start(): Promise<void> {
      const saved = await deps.stateStore.load();
      if (!saved) return;
      await connect(saved.keyBytes, saved);
      void syncNow();
    },

    /** Make a new cloud journal from this device's archive. Returns the key to show the person, once. */
    async setup(): Promise<string> {
      const { bytes, text } = generateKey();
      const keys = await deriveKeys(bytes);
      const transport = deps.makeTransport(keys.authSecret);
      await transport.register(); // throws if offline or the service is unavailable; nothing is saved
      const state: SyncState = { keyBytes: bytes, cursor: 0, pushed: {}, lastSyncedAt: null };
      await deps.stateStore.save(state);
      await connect(bytes, state);
      void syncNow();
      return text;
    },

    /** Connect this device to an existing cloud journal with its key. Local entries are combined with it. */
    async join(input: string): Promise<JoinResult> {
      const parsed = parseKey(input);
      if (!parsed.ok) return { ok: false, reason: KEY_PROBLEMS[parsed.reason] };
      const keys = await deriveKeys(parsed.bytes);
      const transport = deps.makeTransport(keys.authSecret);
      try {
        await transport.pull(0); // proves the journal exists, without creating one by mistake
      } catch (err) {
        if (err instanceof SyncApiError && err.code === 'unauthorized') return { ok: false, reason: 'No journal was found for that key. Check it, or set up sync on your other device first.' };
        return { ok: false, reason: describeFailure(err).message };
      }
      const state: SyncState = { keyBytes: parsed.bytes, cursor: 0, pushed: {}, lastSyncedAt: null };
      await deps.stateStore.save(state);
      await connect(parsed.bytes, state);
      void syncNow();
      return { ok: true };
    },

    syncNow,

    /** Sync soon, after a short pause. For local changes. */
    schedule(): void {
      if (!connection || status.phase === 'auth') return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), debounceMs);
    },

    /** Forget the connection on this device. The cloud copy is untouched. */
    async disconnect(): Promise<void> {
      clearTimeout(timer);
      connection = null;
      await deps.stateStore.clear();
      set({ phase: 'off', lastSyncedAt: null, message: null });
    },

    /** Delete the cloud copy (every device loses its connection), then disconnect this one. */
    async deleteCloud(): Promise<void> {
      if (connection) await connection.transport.remove();
      await this.disconnect();
    },
  };
}

export type SyncController = ReturnType<typeof createSyncController>;
