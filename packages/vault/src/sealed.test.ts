import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Keyring } from './keyring';
import { isSealedArchive, openSealedArchive, sealArchive } from './sealed';

describe('sealed archive', () => {
  it('exports ciphertext that only the recovery key opens', async () => {
    const ring = await Keyring.open(new IDBFactory(), 'sealed-1');
    const { store, keys, recoveryKey } = await ring.create({ kind: 'device' });
    await store.write([{ key: 'kindred/person/a', updatedAt: '2026-01-01T00:00:00Z', deleted: false, value: { id: 'a', name: 'Ana' } }]);
    const text = sealArchive(keys.vaultId, await store.wire());
    expect(text).not.toContain('Ana');
    const parsed = JSON.parse(text);
    expect(isSealedArchive(parsed)).toBe(true);
    const { records, skipped } = await openSealedArchive(parsed, recoveryKey);
    expect(skipped).toBe(0);
    expect(records[0]).toMatchObject({ key: 'kindred/person/a', value: { name: 'Ana' } });
    const other = await (await Keyring.open(new IDBFactory(), 'sealed-2')).create({ kind: 'device' });
    await expect(openSealedArchive(parsed, other.recoveryKey)).rejects.toThrow(/doesn’t belong/);
  });
});
