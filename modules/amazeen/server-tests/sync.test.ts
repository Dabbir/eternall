// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createEntry } from '../src/domain/entries';
import { EMPTY_DATA } from '../src/domain/storage';
import type { AppData, Entry } from '../src/domain/types';
import { createHttpTransport, SyncApiError } from '../src/sync/client';
import type { SyncTransport } from '../src/sync/client';
import { deriveKeys } from '../src/sync/crypto';
import type { Keys } from '../src/sync/crypto';
import { describeFailure, syncOnce } from '../src/sync/engine';
import { LIMITS } from '../src/sync/protocol';
import { handleRequest } from '../src/sync/server/handler';
import { createMemoryStateStore } from '../src/sync/state';
import type { SyncState } from '../src/sync/state';
import { reducer } from '../src/state/reducer';
import type { Action } from '../src/state/reducer';
import { createTestDb } from './testing';

const KEY_BYTES = Uint8Array.from({ length: 16 }, (_, i) => 40 + i);
const BASE = Date.now() - 86_400_000;
const at = (minutes: number) => new Date(BASE + minutes * 60_000).toISOString();

let db: ReturnType<typeof createTestDb>;
let keys: Keys;

/** A device: its own archive, its own sync state, a transport to the (shared) server. */
function device(name: string, options: { offline?: () => boolean } = {}) {
  let data: AppData = EMPTY_DATA;
  const store = createMemoryStateStore();
  const base = createHttpTransport(keys.authSecret, (url, init) => handleRequest(new Request(new URL(url, 'https://amazeen.test'), init), { DB: db }));
  const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (options.offline?.()) throw new SyncApiError('network', 0, 'offline');
    return fn();
  };
  const transport: SyncTransport = {
    register: () => guard(() => base.register()),
    pull: (since) => guard(() => base.pull(since)),
    push: (records) => guard(() => base.push(records)),
    remove: () => guard(() => base.remove()),
  };
  let state: SyncState = { keyBytes: KEY_BYTES, cursor: 0, pushed: {}, lastSyncedAt: null };
  const self = {
    name,
    get data() {
      return data;
    },
    get state() {
      return state;
    },
    /** What this device has saved to disk (survives a crash). */
    saved: () => store.load(),
    act(action: Action) {
      data = reducer(data, action);
    },
    note(id: string, body: string, minutes: number) {
      self.act({ type: 'entry/add', entry: createEntry({ kind: 'note', body }, { section: 'life', mood: 3, starred: false }, new Date(at(minutes)), id) });
    },
    edit(id: string, body: string, minutes: number) {
      const existing = data.entries.find((e) => e.id === id);
      if (!existing) throw new Error('no such entry');
      self.act({ type: 'entry/update', entry: { ...existing, body, updatedAt: at(minutes) } as Entry });
    },
    remove(id: string, minutes: number) {
      self.act({ type: 'entry/delete', id, at: at(minutes) });
    },
    bodies: () => Object.fromEntries(data.entries.map((e) => [e.id, e.kind === 'note' ? e.body : ''])),
    async sync() {
      const outcome = await syncOnce(
        { transport, keys, getData: () => data, applyRemote: (incoming) => self.act({ type: 'data/mergeRemote', incoming }), persist: (s) => store.save(s) },
        state,
      );
      state = outcome.state;
      return outcome;
    },
  };
  return self;
}

/** Sync every device until nothing changes: how a handful of devices settle over a few minutes. */
async function settle(...devices: ReturnType<typeof device>[]) {
  for (let round = 0; round < 4; round++) for (const d of devices) await d.sync();
}

beforeEach(async () => {
  db = createTestDb();
  keys = await deriveKeys(KEY_BYTES);
  await createHttpTransport(keys.authSecret, (url, init) => handleRequest(new Request(new URL(url, 'https://amazeen.test'), init), { DB: db })).register();
});

describe('two devices, one journal', () => {
  it('a new device receives everything the first one wrote', async () => {
    const laptop = device('laptop');
    laptop.note('a', 'Bread day', 1);
    laptop.note('b', 'Rainy walk', 2);
    laptop.act({ type: 'magazine/set', magazine: { title: 'Small Hours', editor: 'Ana', createdAt: at(0) }, at: at(0) });
    await laptop.sync();

    const phone = device('phone');
    const outcome = await phone.sync();
    expect(outcome.pulled).toBe(3); // two entries + the masthead
    expect(phone.bodies()).toEqual({ a: 'Bread day', b: 'Rainy walk' });
    expect(phone.data.magazine?.title).toBe('Small Hours');
  });

  it('what the server stores is unreadable: no titles, no text, no key material', async () => {
    const laptop = device('laptop');
    laptop.act({ type: 'entry/add', entry: createEntry({ kind: 'story', title: 'My Secret Title', body: 'A very private paragraph about Tuesday.' }, { section: 'life', mood: 3, starred: false }, new Date(at(1)), 'story1') });
    laptop.act({ type: 'magazine/set', magazine: { title: 'Hidden Masthead', editor: 'Hidden Editor', createdAt: at(0) }, at: at(0) });
    await laptop.sync();
    const everything = JSON.stringify([db.raw.prepare('SELECT * FROM records').all(), db.raw.prepare('SELECT * FROM accounts').all()]);
    for (const secret of ['Secret Title', 'private paragraph', 'Tuesday', 'Hidden Masthead', 'Hidden Editor', keys.authSecret]) expect(everything).not.toContain(secret);
    expect(everything).toContain('story1'); // the id is visible metadata, by design
  });

  it('edits and deletions travel; a deleted entry never comes back', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.note('a', 'one', 1);
    laptop.note('b', 'two', 1);
    await settle(laptop, phone);

    laptop.edit('a', 'one, edited', 5);
    laptop.remove('b', 6);
    await settle(laptop, phone);
    expect(phone.bodies()).toEqual({ a: 'one, edited' });
    expect(laptop.bodies()).toEqual({ a: 'one, edited' });

    // A third device that has never seen the deleted entry doesn't get it either.
    const tablet = device('tablet');
    await tablet.sync();
    expect(tablet.bodies()).toEqual({ a: 'one, edited' });
  });

  it('a device that was offline and still has the old entry cannot resurrect it', async () => {
    let phoneOffline = false;
    const laptop = device('laptop');
    const phone = device('phone', { offline: () => phoneOffline });
    laptop.note('a', 'keep me', 1);
    laptop.note('gone', 'delete me', 1);
    await settle(laptop, phone);

    phoneOffline = true;
    laptop.remove('gone', 10);
    await laptop.sync();
    await expect(phone.sync()).rejects.toMatchObject({ code: 'network' });
    expect(phone.bodies()).toHaveProperty('gone'); // still has it, offline

    phoneOffline = false;
    await settle(laptop, phone);
    expect(phone.bodies()).toEqual({ a: 'keep me' });
    expect(laptop.bodies()).toEqual({ a: 'keep me' });
  });

  it('concurrent edits to the same entry: the newest wins on every device', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.note('a', 'original', 1);
    await settle(laptop, phone);

    laptop.edit('a', 'laptop edit', 10);
    phone.edit('a', 'phone edit (later)', 12);
    await settle(laptop, phone);
    expect(laptop.bodies()).toEqual({ a: 'phone edit (later)' });
    expect(phone.bodies()).toEqual({ a: 'phone edit (later)' });
  });

  it('delete on one device, edit on another: the later action wins', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.note('a', 'text', 1);
    await settle(laptop, phone);

    laptop.remove('a', 20);
    phone.edit('a', 'edited after the delete', 25);
    await settle(laptop, phone);
    expect(laptop.bodies()).toEqual({ a: 'edited after the delete' });
    expect(phone.bodies()).toEqual({ a: 'edited after the delete' });

    // …and the other way round
    laptop.remove('a', 40);
    phone.edit('a', 'edited before the delete', 35);
    await settle(laptop, phone);
    expect(laptop.bodies()).toEqual({});
    expect(phone.bodies()).toEqual({});
  });

  it('Undo after a deletion restores the entry everywhere', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.note('a', 'oops', 1);
    await settle(laptop, phone);
    const removed = laptop.data.entries[0] as Entry;
    laptop.remove('a', 30);
    await settle(laptop, phone);
    expect(phone.bodies()).toEqual({});
    laptop.act({ type: 'entry/add', entry: removed }); // Undo: an old updatedAt on purpose
    await settle(laptop, phone);
    expect(phone.bodies()).toEqual({ a: 'oops' });
    expect(laptop.bodies()).toEqual({ a: 'oops' });
  });

  it('three devices converge to the same archive regardless of order', async () => {
    const a = device('a');
    const b = device('b');
    const c = device('c');
    a.note('1', 'from a', 1);
    b.note('2', 'from b', 2);
    c.note('3', 'from c', 3);
    a.note('shared', 'a version', 4);
    b.note('shared', 'b version', 5);
    await settle(c, b, a);
    await settle(a, c, b);
    const normal = (d: ReturnType<typeof device>) => JSON.stringify(Object.entries(d.bodies()).toSorted());
    expect(normal(a)).toBe(normal(b));
    expect(normal(b)).toBe(normal(c));
    expect(Object.keys(a.bodies()).toSorted()).toEqual(['1', '2', '3', 'shared']);
  });
});

describe('efficiency and stability', () => {
  it('an idle device pushes nothing and re-pushes nothing on later rounds (no echo loop)', async () => {
    const laptop = device('laptop');
    laptop.note('a', 'x', 1);
    laptop.note('b', 'y', 2);
    expect((await laptop.sync()).pushed).toBe(2);
    for (let i = 0; i < 3; i++) expect((await laptop.sync()).pushed).toBe(0);
  });

  it('only changed records are pushed after the first sync', async () => {
    const laptop = device('laptop');
    for (let i = 0; i < 10; i++) laptop.note(`n${i}`, `body ${i}`, i + 1);
    await laptop.sync();
    laptop.edit('n3', 'changed', 50);
    expect((await laptop.sync()).pushed).toBe(1);
  });

  it('a device with a clock far in the future does not bounce a record forever', async () => {
    const laptop = device('laptop');
    laptop.act({ type: 'entry/add', entry: createEntry({ kind: 'note', body: 'from the future' }, { section: 'life', mood: 3, starred: false }, new Date('2099-01-01T00:00:00Z'), 'future') });
    await laptop.sync();
    for (let i = 0; i < 3; i++) expect((await laptop.sync()).pushed).toBe(0);
  });

  it('pulls a large journal over several pages and pushes it in several batches', async () => {
    const laptop = device('laptop');
    const total = LIMITS.pageSize * 2 + 37;
    for (let i = 0; i < total; i++) laptop.note(`n${i}`, `entry number ${i}`, 1);
    const sent = await laptop.sync();
    expect(sent.pushed).toBe(total);
    const phone = device('phone');
    const got = await phone.sync();
    expect(got.pulled).toBe(total);
    expect(phone.data.entries).toHaveLength(total);
  });

  it('big entries split across batches under the request limit', async () => {
    const laptop = device('laptop');
    const big = 'x'.repeat(15_000);
    for (let i = 0; i < 40; i++) laptop.act({ type: 'entry/add', entry: createEntry({ kind: 'story', title: `Story ${i}`, body: `${big}${i}` }, { section: 'life', mood: 3, starred: false }, new Date(at(i)), `s${i}`) });
    const outcome = await laptop.sync();
    expect(outcome.pushed).toBe(40);
    const phone = device('phone');
    await phone.sync();
    expect(phone.data.entries).toHaveLength(40);
  });

  it('resumes where it left off after a failure partway through, losing nothing', async () => {
    let calls = 0;
    let failFrom = 1; // let the first call (the pull) through, then fail
    const laptop = device('laptop');
    const flaky = device('flaky', { offline: () => calls++ >= failFrom });
    laptop.note('a', 'one', 1);
    await laptop.sync();
    flaky.note('c', 'written on the flaky device', 5);

    await expect(flaky.sync()).rejects.toMatchObject({ code: 'network' }); // pulled, then the push failed
    expect((await flaky.saved())?.cursor).toBeGreaterThan(0); // the pull's progress was saved
    expect(flaky.bodies()).toEqual({ a: 'one', c: 'written on the flaky device' });

    failFrom = Number.POSITIVE_INFINITY;
    await settle(flaky, laptop);
    expect(laptop.bodies()).toEqual({ a: 'one', c: 'written on the flaky device' });
  });
});

describe('the masthead and covers', () => {
  it('the newest change to the masthead wins', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.act({ type: 'magazine/set', magazine: { title: 'Old Name', editor: 'Ana', createdAt: at(0) }, at: at(1) });
    await settle(laptop, phone);
    phone.act({ type: 'magazine/set', magazine: { title: 'New Name', editor: 'Ana', createdAt: at(0) }, at: at(5) });
    phone.act({ type: 'override/set', key: '2026-W47', override: { ink: 'pink' }, at: at(6) });
    await settle(laptop, phone);
    expect(laptop.data.magazine?.title).toBe('New Name');
    expect(laptop.data.overrides).toEqual({ '2026-W47': { ink: 'pink' } });
  });
});

describe('replacing the archive while connected', () => {
  it('replacing everything (import / sample) removes the old entries on other devices too', async () => {
    const laptop = device('laptop');
    const phone = device('phone');
    laptop.note('old1', 'old one', 1);
    laptop.note('old2', 'old two', 2);
    await settle(laptop, phone);

    const replacement: AppData = { ...EMPTY_DATA, entries: [createEntry({ kind: 'note', body: 'fresh' }, { section: 'life', mood: 3, starred: false }, new Date(at(50)), 'fresh')] };
    laptop.act({ type: 'data/replaceAll', data: replacement, at: at(60) });
    await settle(laptop, phone);
    expect(phone.bodies()).toEqual({ fresh: 'fresh' });
    expect(laptop.bodies()).toEqual({ fresh: 'fresh' });
  });
});

describe('damaged or foreign data', () => {
  it('skips records that cannot be read and carries on with the rest', async () => {
    const laptop = device('laptop');
    laptop.note('good', 'fine', 1);
    laptop.note('bad', 'will be damaged', 2);
    await laptop.sync();
    const row = db.raw.prepare("SELECT blob FROM records WHERE rid = 'e:bad'").get() as { blob: string };
    const flipped = row.blob.slice(0, 40) + (row.blob[40] === 'A' ? 'B' : 'A') + row.blob.slice(41);
    db.raw.prepare("UPDATE records SET blob = ? WHERE rid = 'e:bad'").run(flipped);

    const phone = device('phone');
    const outcome = await phone.sync();
    expect(outcome.skipped).toBe(1);
    expect(phone.bodies()).toEqual({ good: 'fine' });
  });

  it('a record moved to a different id on the server is refused', async () => {
    const laptop = device('laptop');
    laptop.note('a', 'text a', 1);
    laptop.note('b', 'text b', 2);
    await laptop.sync();
    const a = db.raw.prepare("SELECT blob FROM records WHERE rid = 'e:a'").get() as { blob: string };
    db.raw.prepare("UPDATE records SET blob = ? WHERE rid = 'e:b'").run(a.blob); // server swaps a's data into b

    const phone = device('phone');
    const outcome = await phone.sync();
    expect(outcome.skipped).toBe(1);
    expect(phone.bodies()).toEqual({ a: 'text a' });
  });

  it('the wrong sync key is refused, not silently treated as a new empty journal', async () => {
    const stranger = await deriveKeys(Uint8Array.from({ length: 16 }, () => 7));
    const transport = createHttpTransport(stranger.authSecret, (url, init) => handleRequest(new Request(new URL(url, 'https://amazeen.test'), init), { DB: db }));
    await expect(transport.pull(0)).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    expect(describeFailure(await transport.pull(0).catch((e: unknown) => e)).kind).toBe('auth');
  });
});

describe('failure messages', () => {
  it('tells offline, auth and other problems apart', () => {
    expect(describeFailure(new SyncApiError('network', 0, 'x')).kind).toBe('offline');
    expect(describeFailure(new SyncApiError('unauthorized', 401, 'x')).kind).toBe('auth');
    expect(describeFailure(new SyncApiError('quota', 429, 'x')).kind).toBe('error');
    expect(describeFailure(new Error('boom'))).toEqual({ kind: 'error', message: 'boom' });
  });
});
