// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry } from '../src/domain/entries';
import { EMPTY_DATA } from '../src/domain/storage';
import type { AppData } from '../src/domain/types';
import { createHttpTransport, SyncApiError } from '../src/sync/client';
import type { SyncTransport } from '../src/sync/client';
import { createSyncController } from '../src/sync/controller';
import { handleRequest } from '../src/sync/server/handler';
import { createMemoryStateStore } from '../src/sync/state';
import { reducer } from '../src/state/reducer';
import type { Action } from '../src/state/reducer';
import { createTestDb } from './testing';

let db: ReturnType<typeof createTestDb>;
let online = true;

const serverFetch = (url: string, init: RequestInit) => {
  if (!online) return Promise.reject(new TypeError('offline'));
  return handleRequest(new Request(new URL(url, 'https://amazeen.test'), init), { DB: db });
};

/** A "browser": archive + saved sync state + controller, like the app's store and provider. */
function browser(options: { debounceMs?: number; counting?: { pulls: number } } = {}) {
  let data: AppData = EMPTY_DATA;
  const stateStore = createMemoryStateStore();
  const make = () =>
    createSyncController({
      stateStore,
      makeTransport: (secret): SyncTransport => {
        const real = createHttpTransport(secret, serverFetch);
        return options.counting ? { ...real, pull: (since) => (options.counting && options.counting.pulls++, real.pull(since)) } : real;
      },
      getData: () => data,
      applyRemote: (incoming) => {
        data = reducer(data, { type: 'data/mergeRemote', incoming });
      },
      ...(options.debounceMs === undefined ? {} : { debounceMs: options.debounceMs }),
    });
  return {
    controller: make(),
    /** Simulate closing and reopening the app: new controller, same saved state. */
    reopen: make,
    stateStore,
    act: (a: Action) => {
      data = reducer(data, a);
    },
    note(id: string, body: string, minutes = 1) {
      this.act({ type: 'entry/add', entry: createEntry({ kind: 'note', body }, { section: 'life', mood: 3, starred: false }, new Date(Date.now() - 86_400_000 + minutes * 60_000), id) });
    },
    bodies: () => Object.fromEntries(data.entries.map((e) => [e.id, e.kind === 'note' ? e.body : ''])),
  };
}

beforeEach(() => {
  db = createTestDb();
  online = true;
});
afterEach(() => vi.useRealTimers());

describe('setting up and joining', () => {
  it('set up on one device, join on another with the key, and the journal appears', async () => {
    const laptop = browser();
    laptop.note('a', 'written on the laptop');
    const keyText = await laptop.controller.setup();
    expect(keyText).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/u);
    await laptop.controller.syncNow();
    expect(laptop.controller.getStatus()).toMatchObject({ phase: 'idle', message: null });
    expect(laptop.controller.getStatus().lastSyncedAt).not.toBeNull();

    const phone = browser();
    phone.note('local', 'already on the phone');
    expect(await phone.controller.join(keyText.toLowerCase().replace(/-/gu, ' '))).toEqual({ ok: true });
    await phone.controller.syncNow();
    expect(phone.bodies()).toEqual({ a: 'written on the laptop', local: 'already on the phone' }); // combined, nothing lost

    await laptop.controller.syncNow();
    expect(laptop.bodies()).toEqual({ a: 'written on the laptop', local: 'already on the phone' });
  });

  it('the key can be shown again on a connected device (to add another)', async () => {
    const laptop = browser();
    const shown = await laptop.controller.setup();
    expect(laptop.controller.keyText()).toBe(shown);
  });

  it('a mistyped key is explained; a valid key with no journal is refused and saves nothing', async () => {
    const phone = browser();
    const bad = await phone.controller.join('ABCD-EFGH');
    expect(bad).toMatchObject({ ok: false });
    expect(bad.ok === false && bad.reason).toMatch(/28 characters/u);

    const other = browser();
    const someoneElsesKey = await other.controller.setup();
    await other.controller.deleteCloud(); // the journal for this key is gone
    const result = await phone.controller.join(someoneElsesKey);
    expect(result.ok === false && result.reason).toMatch(/No journal was found/u);
    expect(await phone.stateStore.load()).toBeNull();
    expect(phone.controller.getStatus().phase).toBe('off');
  });

  it('joining never creates a journal by accident', async () => {
    const stranger = browser();
    await stranger.controller.join('0000-0000-0000-0000-0000-0000-0000');
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 0 });
  });

  it('setting up while offline fails cleanly and leaves nothing behind', async () => {
    online = false;
    const laptop = browser();
    await expect(laptop.controller.setup()).rejects.toMatchObject({ code: 'network' });
    expect(await laptop.stateStore.load()).toBeNull();
    expect(laptop.controller.getStatus().phase).toBe('off');
  });

  it('joining while offline says so, rather than claiming the key is wrong', async () => {
    const laptop = browser();
    const keyText = await laptop.controller.setup();
    online = false;
    const phone = browser();
    const result = await phone.controller.join(keyText);
    expect(result.ok === false && result.reason).toMatch(/offline/iu);
  });
});

describe('staying connected', () => {
  it('reconnects on startup from what the device saved', async () => {
    const laptop = browser();
    laptop.note('a', 'persisted');
    await laptop.controller.setup();
    await laptop.controller.syncNow();

    const reopened = laptop.reopen();
    expect(reopened.getStatus().phase).toBe('off');
    await reopened.start();
    await reopened.syncNow();
    expect(reopened.getStatus().phase).toBe('idle');
    expect(reopened.keyText()).toBe(laptop.controller.keyText());
  });

  it('with nothing saved, start() stays off', async () => {
    const fresh = browser();
    await fresh.controller.start();
    expect(fresh.controller.getStatus().phase).toBe('off');
  });

  it('goes offline without losing anything, then recovers', async () => {
    const laptop = browser();
    await laptop.controller.setup();
    await laptop.controller.syncNow();
    online = false;
    laptop.note('later', 'written offline', 5);
    await laptop.controller.syncNow();
    expect(laptop.controller.getStatus()).toMatchObject({ phase: 'offline' });
    expect(laptop.controller.getStatus().message).toMatch(/offline/iu);
    online = true;
    await laptop.controller.syncNow();
    expect(laptop.controller.getStatus().phase).toBe('idle');

    const phone = browser();
    await phone.controller.join(laptop.controller.keyText() ?? '');
    await phone.controller.syncNow();
    expect(phone.bodies()).toEqual({ later: 'written offline' });
  });

  it('runs one round at a time, however many are requested', async () => {
    const counting = { pulls: 0 };
    const laptop = browser({ counting });
    await laptop.controller.setup();
    await laptop.controller.syncNow();
    counting.pulls = 0;
    await Promise.all([laptop.controller.syncNow(), laptop.controller.syncNow(), laptop.controller.syncNow(), laptop.controller.syncNow()]);
    expect(counting.pulls).toBeLessThanOrEqual(2); // one round, plus at most one catch-up round
  });

  it('batches a burst of local changes into one round after a pause', async () => {
    vi.useFakeTimers();
    const counting = { pulls: 0 };
    const laptop = browser({ debounceMs: 2000, counting });
    await laptop.controller.setup();
    await vi.advanceTimersByTimeAsync(0);
    await laptop.controller.syncNow();
    counting.pulls = 0;
    laptop.controller.schedule();
    laptop.controller.schedule();
    laptop.controller.schedule();
    await vi.advanceTimersByTimeAsync(1999);
    expect(counting.pulls).toBe(0);
    await vi.advanceTimersByTimeAsync(10);
    expect(counting.pulls).toBe(1);
  });

  it('publishes status changes to subscribers', async () => {
    const laptop = browser();
    const seen: string[] = [];
    laptop.controller.subscribe(() => seen.push(laptop.controller.getStatus().phase));
    await laptop.controller.setup();
    await laptop.controller.syncNow();
    expect(seen).toContain('syncing');
    expect(seen.at(-1)).toBe('idle');
  });
});

describe('disconnecting and deleting', () => {
  it('disconnect forgets this device but leaves the cloud copy and other devices alone', async () => {
    const laptop = browser();
    laptop.note('a', 'kept');
    const keyText = await laptop.controller.setup();
    await laptop.controller.syncNow();
    const phone = browser();
    await phone.controller.join(keyText);
    await phone.controller.syncNow();

    await laptop.controller.disconnect();
    expect(laptop.controller.getStatus().phase).toBe('off');
    expect(await laptop.stateStore.load()).toBeNull();
    expect(laptop.controller.keyText()).toBeNull();
    expect(laptop.bodies()).toEqual({ a: 'kept' }); // local data untouched

    phone.note('b', 'still syncing', 9);
    await phone.controller.syncNow();
    expect(phone.controller.getStatus().phase).toBe('idle');
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM records').get()).toEqual({ n: 2 });
  });

  it('deleting the cloud copy disconnects here, and other devices are told, not left looping', async () => {
    const laptop = browser();
    laptop.note('a', 'mine');
    const keyText = await laptop.controller.setup();
    await laptop.controller.syncNow();
    const phone = browser();
    await phone.controller.join(keyText);
    await phone.controller.syncNow();

    await laptop.controller.deleteCloud();
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM records').get()).toEqual({ n: 0 });
    expect(laptop.controller.getStatus().phase).toBe('off');

    await phone.controller.syncNow();
    expect(phone.controller.getStatus().phase).toBe('auth');
    expect(phone.controller.getStatus().message).toMatch(/no longer matches/u);
    expect(phone.bodies()).toEqual({ a: 'mine' }); // their local copy is still theirs
    const pullsBefore = (db.raw.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }).n;
    phone.controller.schedule();
    await phone.controller.syncNow(); // no-ops while in the auth state
    expect((db.raw.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }).n).toBe(pullsBefore);
  });
});

describe('errors from the service', () => {
  it('shows a plain message for server trouble and recovers on the next round', async () => {
    const laptop = browser();
    await laptop.controller.setup();
    await laptop.controller.syncNow();
    const broken = vi.spyOn(db, 'prepare').mockImplementation(() => {
      throw new Error('d1 is down');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await laptop.controller.syncNow();
    expect(laptop.controller.getStatus().phase).toBe('error');
    broken.mockRestore();
    await laptop.controller.syncNow();
    expect(laptop.controller.getStatus().phase).toBe('idle');
  });

  it('has a sensible error type', () => {
    expect(new SyncApiError('quota', 429, 'full')).toBeInstanceOf(Error);
  });
});
