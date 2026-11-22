import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Keyring, SyncApi, Vault, EMPTY_SYNC, syncOnce } from '@eternall/vault';
import { handleRequest, type Env } from '../src/handler';
import { createTestDb, devKeys } from './testing';

/** Two devices, one vault, the real server in between (docs/FLOWS.md F9). */
describe('end-to-end sync between two devices', () => {
  it('moves encrypted records across, never readable on the server', async () => {
    const keys = await devKeys();
    const db = createTestDb();
    const env: Env = { DB: db, LICENCE_PRIVATE_JWK: JSON.stringify(keys.privateJwk), PAYMENT_PROVIDER: 'dev' };
    const fetchVia: typeof fetch = async (input, init) => handleRequest(new Request(new URL(String(input), 'https://eternall.test'), init), env);

    // Device A: create the vault, buy Patron, turn on sync, write something.
    const ringA = await Keyring.open(new IDBFactory(), 'a');
    const a = await ringA.create({ kind: 'device' });
    const vaultA = await Vault.open(a.store);
    vaultA.collection<{ id: string; text: string }>('kindred/person').put({ id: 'ana', text: 'Ana — the private note' });
    await vaultA.flush();
    const checkout = (await (await fetchVia('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: 'yearly' }), headers: { 'content-type': 'application/json' } })).json()) as { url: string };
    const code = new URL(checkout.url, 'https://x').searchParams.get('claim')!;
    const { token } = (await (await fetchVia('/api/licence/claim', { method: 'POST', body: JSON.stringify({ code }), headers: { 'content-type': 'application/json' } })).json()) as { token: string };
    const apiA = new SyncApi(a.keys.authSecret, '/api', fetchVia);
    await apiA.register(token);
    const first = await syncOnce(apiA, a.store, { ...EMPTY_SYNC, enabled: true });
    expect(first.sent).toBe(1);

    // The server holds ciphertext only.
    const rows = db.raw.prepare('SELECT rid, blob FROM records').all() as { rid: string; blob: string }[];
    expect(JSON.stringify(rows)).not.toContain('Ana');
    expect(JSON.stringify(rows)).not.toContain('kindred');

    // Device B: adopt the vault with the recovery key, pull, read.
    const ringB = await Keyring.open(new IDBFactory(), 'b');
    const b = await ringB.adopt(a.recoveryKey, { kind: 'device' });
    const apiB = new SyncApi(b.keys.authSecret, '/api', fetchVia);
    const pulled = await syncOnce(apiB, b.store, { ...EMPTY_SYNC, enabled: true });
    expect(pulled.received).toBe(1);
    const vaultB = await Vault.open(b.store);
    expect(vaultB.collection<{ id: string; text: string }>('kindred/person').get('ana')?.text).toBe('Ana — the private note');

    // An edit on B wins on A.
    vaultB.collection<{ id: string; text: string }>('kindred/person').put({ id: 'ana', text: 'Ana — updated on B' });
    await vaultB.flush();
    await syncOnce(apiB, b.store, pulled.state);
    await syncOnce(apiA, a.store, first.state);
    vaultA.merge(await a.store.load(), { persist: false });
    expect(vaultA.collection<{ id: string; text: string }>('kindred/person').get('ana')?.text).toBe('Ana — updated on B');
  });

  it('rotates the key: records survive, the old key no longer opens them', async () => {
    const ring = await Keyring.open(new IDBFactory(), 'rot');
    const { store, recoveryKey } = await ring.create({ kind: 'device' });
    await store.write([{ key: 'house/inscription/x', updatedAt: '2026-01-01T00:00:00Z', deleted: false, value: { id: 'x', title: 'kept' } }]);
    const rotated = await ring.rotate({ kind: 'device' }, { kind: 'device' }, store);
    expect((await rotated.store.load())[0]).toMatchObject({ value: { title: 'kept' } });
    expect(rotated.recoveryKey).not.toBe(recoveryKey);
    await expect(ring.unlock({ kind: 'recovery', text: recoveryKey })).rejects.toThrow(/different vault/);
  });
});
