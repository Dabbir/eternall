// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decryptRecord, deriveKeys, encryptRecord, fromBase64Url, SyncCryptoError, toBase64Url } from './crypto';
import { formatKey, generateKey, KEY_CHARS, parseKey } from './keyphrase';

describe('sync key', () => {
  it('generates 128 random bits as seven groups of four, and parses back to the same bytes', () => {
    const { bytes, text } = generateKey();
    expect(bytes).toHaveLength(16);
    expect(text).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/u);
    const parsed = parseKey(text);
    expect(parsed.ok && Array.from(parsed.bytes)).toEqual(Array.from(bytes));
  });

  it('forgives case, spaces, dashes and look-alike letters', () => {
    const { bytes, text } = generateKey(() => Uint8Array.from({ length: 16 }, (_, i) => i * 13));
    const sloppy = text.toLowerCase().replace(/-/gu, ' ').replace(/0/gu, 'o').replace(/1/gu, 'l');
    const parsed = parseKey(`  ${sloppy}  `);
    expect(parsed.ok && Array.from(parsed.bytes)).toEqual(Array.from(bytes));
  });

  it('catches every single-character typo with the checksum', () => {
    const { text } = generateKey(() => Uint8Array.from({ length: 16 }, (_, i) => 255 - i * 9));
    const compact = text.replace(/-/gu, '');
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let missed = 0;
    for (let i = 0; i < compact.length; i++) {
      for (const ch of alphabet) {
        if (ch === compact[i]) continue;
        const typo = compact.slice(0, i) + ch + compact.slice(i + 1);
        if (parseKey(formatKey(typo)).ok) missed += 1;
      }
    }
    expect(missed).toBe(0);
  });

  it('explains what is wrong', () => {
    expect(parseKey('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseKey('ABCD-EFGH')).toEqual({ ok: false, reason: 'length' });
    expect(parseKey('!'.repeat(KEY_CHARS))).toEqual({ ok: false, reason: 'characters' });
    expect(parseKey('0'.repeat(KEY_CHARS - 1) + '1')).toEqual({ ok: false, reason: 'checksum' });
  });

  it('produces different keys each time', () => {
    expect(generateKey().text).not.toBe(generateKey().text);
  });
});

describe('record encryption', () => {
  const keyBytes = Uint8Array.from({ length: 16 }, (_, i) => i + 1);

  it('derives stable, separate secrets from one key', async () => {
    const a = await deriveKeys(keyBytes);
    const b = await deriveKeys(keyBytes);
    expect(a.authSecret).toBe(b.authSecret);
    expect(a.accountId).toBe(b.accountId);
    expect(a.authSecret).not.toBe(a.accountId);
    expect(fromBase64Url(a.authSecret)).toHaveLength(32);
    const other = await deriveKeys(Uint8Array.from({ length: 16 }, (_, i) => i + 2));
    expect(other.accountId).not.toBe(a.accountId);
  });

  it('round-trips, and the ciphertext does not contain the plaintext', async () => {
    const keys = await deriveKeys(keyBytes);
    const entry = { id: 'e1', kind: 'note', body: 'A very private thought about Tuesday' };
    const blob = await encryptRecord(keys, 'e:e1', entry);
    expect(blob).not.toContain('private');
    expect(String.fromCharCode(...fromBase64Url(blob))).not.toContain('private');
    expect(await decryptRecord(keys, 'e:e1', blob)).toEqual(entry);
  });

  it('uses a fresh IV every time', async () => {
    const keys = await deriveKeys(keyBytes);
    expect(await encryptRecord(keys, 'r', { a: 1 })).not.toBe(await encryptRecord(keys, 'r', { a: 1 }));
  });

  it('rejects the wrong key, an altered blob, and a blob moved to another record or account', async () => {
    const keys = await deriveKeys(keyBytes);
    const blob = await encryptRecord(keys, 'e:one', { secret: true });

    const stranger = await deriveKeys(Uint8Array.from({ length: 16 }, () => 9));
    await expect(decryptRecord(stranger, 'e:one', blob)).rejects.toBeInstanceOf(SyncCryptoError);

    const bytes = fromBase64Url(blob);
    bytes[bytes.length - 3] = (bytes[bytes.length - 3] ?? 0) ^ 1;
    await expect(decryptRecord(keys, 'e:one', toBase64Url(bytes))).rejects.toBeInstanceOf(SyncCryptoError);

    await expect(decryptRecord(keys, 'e:two', blob)).rejects.toBeInstanceOf(SyncCryptoError); // swapped record
    await expect(decryptRecord({ ...keys, accountId: 'someone-else' }, 'e:one', blob)).rejects.toBeInstanceOf(SyncCryptoError);
    await expect(decryptRecord(keys, 'e:one', 'not base64 !!')).rejects.toBeInstanceOf(SyncCryptoError);
    await expect(decryptRecord(keys, 'e:one', 'AAAA')).rejects.toBeInstanceOf(SyncCryptoError);
  });

  it('handles large records (a 20k-character story)', async () => {
    const keys = await deriveKeys(keyBytes);
    const body = 'lorem ipsum '.repeat(1700);
    const blob = await encryptRecord(keys, 'e:big', { body });
    expect(((await decryptRecord(keys, 'e:big', blob)) as { body: string }).body).toBe(body);
  });

  it('base64url round-trips arbitrary bytes', () => {
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) % 256);
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
    expect(toBase64Url(bytes)).toMatch(/^[A-Za-z0-9_-]+$/u);
  });
});
