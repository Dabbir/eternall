import { createMemoryStore, Vault } from '@eternall/vault';
import { handleRequest as amazeenHandler } from '@eternall/amazeen/sync/server/handler';
import { deriveKeys } from '@eternall/amazeen/sync/crypto';
import { generateKey } from '@eternall/amazeen/sync/keyphrase';
import { encodeLocal, localRecords } from '@eternall/amazeen/sync/records';
import { importWithSyncKey } from '@eternall/amazeen/imprint/legacyImport';
import { readFromVault } from '@eternall/amazeen/imprint/vaultAdapter';
import type { AppData } from '@eternall/amazeen/domain/types';
import { handleRequest, type Env } from '../src/handler';
import { createTestDb, devKeys } from './testing';

describe('F15 path 2: moving in with an AMAZEEN sync key', () => {
  it('pulls the old journal through the read-only door and re-encrypts it into the vault', async () => {
    const legacy = createTestDb(new URL('../../../modules/amazeen/migrations/0001_init.sql', import.meta.url));
    const { bytes, text } = generateKey();
    const keys = await deriveKeys(bytes);
    const journal: AppData = {
      version: 2,
      magazine: { title: 'The Weekly Me', editor: 'Mira', createdAt: '2026-01-01T00:00:00.000Z' },
      entries: [{ id: 'e1', kind: 'note', body: 'The first note, from AMAZEEN.', createdAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-01T09:00:00.000Z', section: 'life', mood: 4, starred: false }],
      tombstones: {},
      overrides: {},
    };
    // Put the journal on AMAZEEN's old server, exactly as AMAZEEN's own client would.
    const auth = { authorization: `Bearer ${keys.authSecret}`, 'content-type': 'application/json' };
    await amazeenHandler(new Request('https://amazeen.test/api/account', { method: 'POST', headers: auth }), { DB: legacy });
    const wire = await Promise.all(localRecords(journal).map((r) => encodeLocal(keys, journal, r)));
    await amazeenHandler(new Request('https://amazeen.test/api/sync', { method: 'POST', headers: auth, body: JSON.stringify({ records: wire }) }), { DB: legacy });

    const env: Env = { DB: createTestDb(), LEGACY_DB: legacy, LICENCE_PRIVATE_JWK: JSON.stringify((await devKeys()).privateJwk) };
    const fetchVia: typeof fetch = async (input, init) => handleRequest(new Request(new URL(String(input), 'https://eternall.test'), init), env);
    const vault = await Vault.open(createMemoryStore());
    const result = await importWithSyncKey(vault, text, fetchVia);
    expect(result).toMatchObject({ added: 1, skipped: 0 });
    const data = readFromVault(vault);
    expect(data.magazine?.title).toBe('The Weekly Me');
    expect(data.entries[0]).toMatchObject({ body: 'The first note, from AMAZEEN.' });
    // The legacy door is read-only.
    const write = await fetchVia('/api/legacy/amazeen/sync', { method: 'POST', headers: auth, body: '{}' });
    expect(write.status).toBe(404);
  });
});
