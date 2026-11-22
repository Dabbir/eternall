# Sync: design and security notes

AMAZEEN is local-first. Sync is optional, and it is built so the server **cannot read a journal**.

## How it works

1. **One secret.** Turning on sync makes a random 128-bit *sync key*, shown once as `K7QF-2M9T-…` (seven groups of four, with a typo-catching checksum). It is the only thing a person has to keep.
2. **Two keys from it** (HKDF-SHA256, different labels):
   - `authSecret` (256 bits): sent as `Authorization: Bearer …`. The server stores only its SHA-256, which is also the account id. It identifies the account but can't be turned back into the key.
   - `encKey` (AES-256-GCM): never leaves the device (stored as a non-extractable `CryptoKey` while in use).
3. **Per-record encryption.** Each entry, and the masthead/cover settings, is encrypted separately with a fresh random 96-bit IV. The account id and record id are bound in as *authenticated data*, so the server can't swap one record's data for another's or move it between accounts.
4. **Merging.** Records carry a change time. Newest wins per record; a live entry beats a deletion on an exact tie. Deletions are kept as *tombstones* so a device that missed one can't undo it. The same `mergeData` function serves file imports and sync.
5. **Transport.** Same-origin HTTPS to a Cloudflare Worker backed by D1 (the app itself is served as static assets; only `/api/*` reaches the Worker). Pull is incremental (server change numbers); push is a transactional batch.

## What the server can and can't see

| Can see | Cannot see |
| --- | --- |
| That a journal exists (a hash of the secret) | Titles, text, lists, quotes |
| Record ids, count, rough size | Moods, sections, stars, cover ink |
| When each record last changed, and deletions | The masthead name or byline |
| Request IP and time (standard host logs) | The sync key or the encryption key |

## Threat model

| Threat | Outcome |
| --- | --- |
| Database leak or a curious operator | Attacker gets ciphertext plus the metadata above. Content stays unreadable without the key. |
| Guessing a key | 128 random bits: not feasible. (Keys are generated, never chosen, so weak passphrases can't be attacked offline.) |
| Server edits or swaps records | AES-GCM + bound ids make this fail decryption; the client skips the record and says so. |
| Server replays an older version of a record | Not detected cryptographically; the client's last-writer-wins would accept an older write only if its timestamp is newer than ours. A malicious server could withhold or roll back changes (availability/freshness), not read or forge content. |
| Another person on the network | HTTPS. Responses are `no-store`. |
| Abuse of the API | Strict validation, size/record quotas, per-request limits. **Add Cloudflare rate-limiting rules** (see README). |

## Known limitations (deliberate or deferred)

- **Lose the key, lose the cloud copy.** That is the point of end-to-end encryption. Devices that are still connected keep their local copy and can export it.
- **The key lives on the device** (IndexedDB) so "show my key" and "add a device" work. Anyone with access to the unlocked browser profile, or script running in the page (XSS), could use it. The strict CSP (no inline scripts, same-origin only) limits XSS but doesn't remove it.
- **Metadata is visible** (see above). Padding or batching to hide record counts is not implemented.
- **No per-device revocation or key rotation.** Anyone who has the key can sync. To cut access, export, delete the cloud copy, and start a new one with a new key.
- **Clocks matter.** Last-writer-wins uses device clocks. The server clamps timestamps to now + 5 minutes so one wrong clock can't pin a record forever, but a device with a clock that is wrong *and slightly behind* can lose an edit race.
- **Tombstones are never pruned.** They are tiny; a device offline for a very long time still can't resurrect a deleted entry.
- **Anonymous accounts.** Anyone can create one (it costs a key). Quotas (30k records, ~170 KB per record) bound the damage per account; rate limiting bounds creation.
- **One journal per key**, no sharing between people.
