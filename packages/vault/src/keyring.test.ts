import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Keyring } from './keyring';
import { Vault } from './vault';

let n = 0;
const fresh = () => Keyring.open(new IDBFactory(), `test-${n++}`);

describe('Keyring and the encrypted store', () => {
  it('creates a vault, stores only ciphertext, and opens it again with the passphrase', async () => {
    const factory = new IDBFactory();
    const ring = await Keyring.open(factory, 'k1');
    const { store, recoveryKey } = await ring.create({ kind: 'passphrase', passphrase: 'a long passphrase', iterations: 1000 });
    expect(recoveryKey).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){6}$/);
    const vault = await Vault.open(store);
    vault.collection<{ id: string; text: string }>('envoi/letter').put({ id: 'a', text: 'THE SECRET' });
    await vault.flush();

    const wire = await store.wire();
    expect(wire).toHaveLength(1);
    expect(JSON.stringify(wire)).not.toContain('SECRET');
    expect(JSON.stringify(wire)).not.toContain('envoi');

    const again = await Keyring.open(factory, 'k1');
    expect(again.exists).toBe(true);
    await expect(again.unlock({ kind: 'passphrase', passphrase: 'wrong' })).rejects.toThrow(/didn’t open/);
    const opened = await again.unlock({ kind: 'passphrase', passphrase: 'a long passphrase' });
    expect((await opened.store.load())[0]).toMatchObject({ key: 'envoi/letter/a', value: { id: 'a', text: 'THE SECRET' } });
  });

  it('opens with the recovery key, and rejects another vault’s key', async () => {
    const ring = await fresh();
    const { recoveryKey } = await ring.create({ kind: 'passphrase', passphrase: 'pass phrase 1', iterations: 1000 });
    await expect(ring.unlock({ kind: 'recovery', text: recoveryKey.toLowerCase() })).resolves.toBeTruthy();
    const other = await fresh();
    const { recoveryKey: otherKey } = await other.create({ kind: 'passphrase', passphrase: 'x'.repeat(12), iterations: 1000 });
    await expect(ring.unlock({ kind: 'recovery', text: otherKey })).rejects.toThrow(/different vault/);
    await expect(ring.unlock({ kind: 'recovery', text: 'nope' })).rejects.toThrow(/28 characters|recovery key/);
  });

  it('opens silently with a device key, and a lock can be changed with proof', async () => {
    const ring = await fresh();
    const { recoveryKey } = await ring.create({ kind: 'device' });
    expect(ring.opensSilently).toBe(true);
    await ring.unlock({ kind: 'device' });
    await ring.setLock({ kind: 'device' }, { kind: 'passphrase', passphrase: 'new passphrase', iterations: 1000 });
    expect(ring.methods).toEqual(['passphrase']);
    expect(ring.opensSilently).toBe(false);
    expect(await ring.revealRecoveryKey({ kind: 'passphrase', passphrase: 'new passphrase' })).toBe(recoveryKey);
  });

  it('skips records that were tampered with', async () => {
    const factory = new IDBFactory();
    const ring = await Keyring.open(factory, 'k2');
    const { store } = await ring.create({ kind: 'device' });
    await store.write([{ key: 'house/inscription/a', updatedAt: '2026-01-01T00:00:00Z', deleted: false, value: { id: 'a' } }]);
    const [w] = await store.wire();
    const db = await (await import('./idb')).openVaultDb(factory, 'k2');
    await db.putRecords([{ ...w!, blob: w!.blob.slice(0, -4) + 'AAAA' }]);
    expect(await store.load()).toEqual([]);
    expect(store.unreadable).toBe(1);
  });

  it('destroys everything', async () => {
    const ring = await fresh();
    await ring.create({ kind: 'device' });
    await ring.destroy();
    expect(ring.exists).toBe(false);
  });
});
