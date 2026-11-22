# ADR 0002 — One encrypted vault for the whole platform

Status: Proposed · Date: 2026-11-22

## Context
AMAZEEN sells on privacy, but it encrypts only sync. Local data is plaintext, there is no app lock, and the raw sync key sits in IndexedDB. ETERNALL holds even more sensitive material (letters, people, hopes). Privacy has to be a property of the platform, not of one imprint.

## Decision
- A single **vault** per person, implemented in `packages/vault` (`PRIVACY.md`). All imprints read and write only through it.
- Keys: a 128-bit generated Vault Key; HKDF derives the data, record-id, auth and licence keys.
- Storage: per-record AES-256-GCM with AAD binding, and opaque HMAC record IDs.
- Unlock: lock methods (passkey PRF, passphrase PBKDF2-SHA256 600k, or device key) wrap the Vault Key. Auto-lock is on, and a recovery kit is issued.
- **PBKDF2 is the v1 KDF** because it is native to Web Crypto. Argon2id via WASM is the planned upgrade. Wrapped blobs are versioned so they can be re-wrapped.

## Consequences
- Every imprint inherits encryption at rest, lock and sync for free.
- Search runs over decrypted data in memory only, which costs some performance on large archives (mitigated by a Web Worker).
- Losing both the passphrase and the recovery kit means losing the data. This is communicated plainly.

## Alternatives considered
- **Privacy per imprint:** rejected because the promise would be weaker and harder to explain.
- **Keeping AMAZEEN's model (sync-only E2EE):** rejected because it leaves the local gaps open.
