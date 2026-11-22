import { mergeData } from '../domain/backup';
import { createVaultAdapter, readFromVault, type VaultLike } from './vaultAdapter';
import { deriveKeys } from '../sync/crypto';
import { KEY_PROBLEMS, parseKey } from '../sync/keyphrase';
import { decodeRemote } from '../sync/records';
import type { PullResponse, WireRecord } from '../sync/protocol';

/**
 * F15 path 2: bring a journal from AMAZEEN's old sync with its sync key. The old records are pulled
 * from a read-only door (`/api/legacy/amazeen/sync`), decrypted here with AMAZEEN's own keys, and
 * re-encrypted into the ETERNALL vault. The key never leaves this device.
 */
export async function importWithSyncKey(vault: VaultLike, keyText: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<{ added: number; updated: number; skipped: number }> {
  const parsed = parseKey(keyText);
  if (!parsed.ok) throw new Error(KEY_PROBLEMS[parsed.reason]);
  const keys = await deriveKeys(parsed.bytes);
  const records: WireRecord[] = [];
  let since = 0;
  for (;;) {
    const res = await fetchImpl(`/api/legacy/amazeen/sync?since=${since}`, { headers: { authorization: `Bearer ${keys.authSecret}` } });
    if (res.status === 401) throw new Error('No AMAZEEN journal is stored for that sync key.');
    if (!res.ok) throw new Error('AMAZEEN’s old sync can’t be reached from here yet. Use “Move to ETERNALL” in AMAZEEN, or an export file.');
    const page = (await res.json()) as PullResponse;
    records.push(...page.records.map(({ seq: _seq, ...r }) => r));
    since = page.cursor;
    if (!page.more) break;
  }
  const decoded = await decodeRemote(keys, records);
  const merged = mergeData(readFromVault(vault), decoded.incoming, { meta: 'newest' });
  await createVaultAdapter(vault).save(merged.data);
  await vault.flush();
  return { added: merged.added, updated: merged.updated, skipped: decoded.skipped };
}

/**
 * Where an existing AMAZEEN journal moves into ETERNALL (docs/FLOWS.md F15).
 * AMAZEEN v1.5 opens this page in a popup and hands its archive over with postMessage.
 * Only allow-listed AMAZEEN origins are trusted, and every exchange carries a one-time nonce.
 */


