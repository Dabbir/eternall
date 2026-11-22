import { decryptRecord, deriveVaultKeys, encryptRecord, opaqueRid, passphraseKek, randomBytes, unwrapVaultKey, wrapVaultKey, VaultCryptoError } from './crypto';
import { generateKey, parseKey } from './keyphrase';

describe('vault crypto', () => {
  it('derives the same keys and ids from the same Vault Key', async () => {
    const vk = randomBytes(16);
    const a = await deriveVaultKeys(vk);
    const b = await deriveVaultKeys(new Uint8Array(vk));
    expect(a.vaultId).toBe(b.vaultId);
    expect(await opaqueRid(a, 'envoi/letter/x')).toBe(await opaqueRid(b, 'envoi/letter/x'));
    expect(await opaqueRid(a, 'envoi/letter/x')).toHaveLength(22);
    expect(await opaqueRid(a, 'envoi/letter/x')).not.toBe(await opaqueRid(a, 'envoi/letter/y'));
  });

  it('round-trips a record and binds it to its id and vault', async () => {
    const keys = await deriveVaultKeys(randomBytes(16));
    const blob = await encryptRecord(keys, 'rid1', { secret: 'hello' });
    expect(blob).not.toContain('hello');
    expect(await decryptRecord(keys, 'rid1', blob)).toEqual({ secret: 'hello' });
    await expect(decryptRecord(keys, 'rid2', blob)).rejects.toBeInstanceOf(VaultCryptoError);
    const other = await deriveVaultKeys(randomBytes(16));
    await expect(decryptRecord(other, 'rid1', blob)).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it('wraps the Vault Key with a passphrase', async () => {
    const vk = randomBytes(16);
    const salt = randomBytes(16);
    const wrapped = await wrapVaultKey(await passphraseKek('correct horse', salt, 1000), vk);
    expect(Array.from(await unwrapVaultKey(await passphraseKek('correct horse', salt, 1000), wrapped))).toEqual(Array.from(vk));
    await expect(unwrapVaultKey(await passphraseKek('wrong', salt, 1000), wrapped)).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it('shows the Vault Key as a recovery key that parses back, forgiving typos of look-alikes', () => {
    const { bytes, text } = generateKey();
    const parsed = parseKey(text.toLowerCase().replace(/0/g, 'o'));
    expect(parsed.ok && Array.from(parsed.bytes)).toEqual(Array.from(bytes));
    expect(parseKey(text.slice(0, -1) + (text.endsWith('A') ? 'B' : 'A')).ok).toBe(false);
  });
});
