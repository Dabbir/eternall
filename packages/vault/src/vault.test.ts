import { createMemoryStore } from './store';
import { Vault } from './vault';
import { mergeRecords, newer, type VaultRecord } from './records';

interface Note { id: string; text: string }

describe('Vault', () => {
  it('reads its writes synchronously and persists them in a batch', async () => {
    const store = createMemoryStore();
    const vault = await Vault.open(store, { debounceMs: 5 });
    const notes = vault.collection<Note>('house/note');
    notes.put({ id: 'a', text: 'hello' });
    expect(notes.all()).toEqual([{ id: 'a', text: 'hello' }]);
    expect(store.dump()).toHaveLength(0);
    await vault.flush();
    expect(store.dump()).toHaveLength(1);
  });

  it('keeps tombstones and supports undo by re-putting', async () => {
    const vault = await Vault.open(createMemoryStore());
    const notes = vault.collection<Note>('house/note');
    notes.put({ id: 'a', text: 'x' });
    const removed = notes.remove('a');
    expect(notes.all()).toEqual([]);
    expect(vault.snapshot()[0]).toMatchObject({ deleted: true });
    notes.put(removed!);
    expect(notes.get('a')).toEqual({ id: 'a', text: 'x' });
  });

  it('makes rapid edits strictly newer', async () => {
    const vault = await Vault.open(createMemoryStore(), { now: () => '2026-01-01T00:00:00.000Z' });
    const notes = vault.collection<Note>('house/note');
    notes.put({ id: 'a', text: '1' });
    notes.put({ id: 'a', text: '2' });
    const [rec] = vault.snapshot();
    expect(rec!.updatedAt > '2026-01-01T00:00:00.000Z').toBe(true);
  });

  it('memoises collection arrays until something changes', async () => {
    const vault = await Vault.open(createMemoryStore());
    const notes = vault.collection<Note>('house/note');
    const a = notes.all();
    expect(notes.all()).toBe(a);
    notes.put({ id: 'b', text: 'y' });
    expect(notes.all()).not.toBe(a);
  });

  it('rejects malformed paths and ids', async () => {
    const vault = await Vault.open(createMemoryStore());
    expect(() => vault.collection<Note>('Bad Path').put({ id: 'a', text: '' })).toThrow();
    expect(() => vault.collection<Note>('house/note').put({ id: 'a/b', text: '' })).toThrow();
  });

  it('retries a failed flush without losing data', async () => {
    const store = createMemoryStore();
    let fail = true;
    const flaky = { ...store, write: async (r: readonly VaultRecord[]) => (fail ? Promise.reject(new Error('boom')) : store.write(r)) };
    const vault = await Vault.open(flaky);
    vault.collection<Note>('house/note').put({ id: 'a', text: 'kept' });
    expect(await vault.flush()).toEqual({ ok: false, reason: 'unavailable' });
    fail = false;
    expect(await vault.flush()).toEqual({ ok: true });
    expect(store.dump()).toHaveLength(1);
  });

  it('erases whole collections as tombstones', async () => {
    const vault = await Vault.open(createMemoryStore());
    vault.collection<Note>('envoi/letter').put({ id: 'a', text: '' });
    vault.collection<Note>('house/note').put({ id: 'b', text: '' });
    expect(vault.eraseCollections(['envoi/letter'])).toBe(1);
    expect(vault.collection('envoi/letter').all()).toHaveLength(0);
    expect(vault.collection('house/note').all()).toHaveLength(1);
  });
});

describe('merge', () => {
  const rec = (updatedAt: string, deleted = false): VaultRecord => ({ key: 'a/b/c', updatedAt, deleted, value: deleted ? null : updatedAt });

  it('lets the newest change win and live beat deleted on a tie', () => {
    expect(newer(rec('2'), rec('1')).updatedAt).toBe('2');
    expect(newer(rec('1', true), rec('1')).deleted).toBe(false);
  });

  it('reports only records that changed', () => {
    const map = new Map([['a/b/c', rec('2')]]);
    expect(mergeRecords(map, [rec('1')])).toHaveLength(0);
    expect(mergeRecords(map, [rec('3')])).toHaveLength(1);
  });
});

describe('moving stores', () => {
  it('writes everything into the new store and keeps working', async () => {
    const a = createMemoryStore();
    const b = createMemoryStore();
    const vault = await Vault.open(a);
    vault.collection<Note>('house/note').put({ id: 'x', text: '1' });
    expect(vault.hasRecordsOutside(['house/settings'])).toBe(true);
    await vault.setStore(b);
    expect(b.dump()).toHaveLength(1);
    vault.collection<Note>('house/note').put({ id: 'y', text: '2' });
    const seen: number[] = [];
    vault.onFlushed((r) => seen.push(r.length));
    await vault.flush();
    expect(b.dump()).toHaveLength(2);
    expect(a.dump()).toHaveLength(0);
    expect(seen).toEqual([1]);
  });
});
