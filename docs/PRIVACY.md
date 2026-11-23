# ETERNALL — Privacy & Security

Status: draft for review · Phase 0 · Builds on `amazeen-app/docs/sync-security.md` · Related: `ARCHITECTURE.md`, `BUSINESS.md`, `FLOWS.md`

> **The promise:** nothing you write in any ETERNALL imprint can be read by anyone but you. That includes us, our hosting provider, and anyone who breaches either.
> **The honesty:** this document also lists, plainly, what that promise does *not* cover.

---

## 1. Goals and non-goals

**Goals**
1. Content of every imprint is **encrypted at rest on the device** and **end-to-end encrypted in sync**.
2. **No accounts:** no email, password or phone number held by ETERNALL.
3. **One vault for the whole platform**, so privacy doesn't depend on which imprint you use.
4. **An app lock** so a borrowed or shared device doesn't expose your writing.
5. **Recoverable by you, and only you**, through a recovery kit.
6. **Closes the gaps in AMAZEEN v1.4:** plaintext data at rest, no app lock, and the raw sync key stored in IndexedDB.

**Non-goals** (stated so nobody is misled)
- Protecting against malware, a compromised OS, or a malicious browser extension on an unlocked device.
- Hiding *that* you use ETERNALL, or traffic metadata, from your network or our host.
- Anonymity from the payment provider when you subscribe (`BUSINESS.md` §4).

## 2. Key hierarchy

```
                        Vault Key (VK)  — 128 random bits, generated, never chosen
                        shown once as the Recovery Key:  K7QF-2M9T-…  (AMAZEEN keyphrase format:
                        Crockford-style base32, 28 chars incl. 2-char checksum)
                                   │
                   HKDF-SHA256 (salt "eternall/vault/v1"), separate labels
        ┌──────────────┬───────────┴───────────┬──────────────────┬───────────────────┐
     "enc"           "rid"                   "auth"              "licence"
  Data Key (DK)   Record-ID Key (RK)      Auth Secret (AS)     Licence Binding Key (LK)
  AES-256-GCM     HMAC-SHA256             256-bit; server       HMAC; binds licence
  non-extractable non-extractable         stores SHA-256(AS)    token to this vault
                                          = Vault ID            without revealing VK

   Lock methods wrap VK (never DK) at rest:
     • Passphrase  → KEK = PBKDF2-SHA256(passphrase, salt, 600,000 iters)  ── AES-GCM wrap(VK)
     • Passkey     → KEK = WebAuthn PRF output (where supported)          ── AES-GCM wrap(VK)
     • Device only → KEK = non-extractable AES key stored in IndexedDB    ── AES-GCM wrap(VK)
   A vault may hold several wrapped copies of VK (e.g. passkey + passphrase).
```

- **The Vault Key is generated, never chosen,** so weak human passphrases can't weaken the encryption of synced data (the same reasoning as AMAZEEN's sync key). Passphrases only protect the *local unlock*.
- **PBKDF2 is the v1 KDF** because it is native to Web Crypto (no dependency). Argon2id via WASM is the preferred upgrade and is noted in ADR 0002. The wrapped blob records its KDF and parameters, so upgrades re-wrap on next unlock.
- **While unlocked**, only non-extractable `CryptoKey`s (DK, RK) live in memory. **The raw VK is not kept** after unlock. Showing the recovery key again requires re-entering the passphrase or passkey (fixing AMAZEEN's `keyBytes` gap).

## 3. Encryption at rest

- **Every record** (an AMAZEEN entry, a sealed letter, a KINDRED card…) is encrypted individually: AES-256-GCM, a fresh random 96-bit IV, and **AAD = `vaultId ‖ 0x00 ‖ rid`**, so a record can't be swapped or moved between vaults undetected (AMAZEEN's construction, generalised).
- **What is stored in plaintext locally:**
  - The wrapped VK blobs and their KDF parameters.
  - The vault ID.
  - Opaque record IDs, record sizes and `updatedAt` timestamps.
  - UI preferences that carry no personal content (theme, "Flat pages", last-opened imprint).
- **Search** decrypts in a worker into memory and builds an in-memory index for the session. **No plaintext index is ever written to disk.**
- **Drafts** (unsent text in editors) are encrypted with DK before being written. If the vault is locked mid-draft, the draft is encrypted and saved, never discarded.
- **Nothing personal is ever written to `localStorage`.** Plaintext from the original app and from Phase 1 development is moved into the vault and deleted once the vault exists.

## 4. The app lock

| Setting | Default | Notes |
|---|---|---|
| Lock method | Offered at vault creation: **Passkey** (recommended where PRF is supported) · **Passphrase** · **Skip for now** (device-only key) | "Skip" is honest about its limit: *"Protects against copying your data off this device, not against someone using this browser."* A reminder to add a lock appears after the first week (dismissible). |
| Auto-lock | After 15 minutes without interaction, and 5 minutes after the tab is hidden | Configurable 1 minute – 8 hours, or "only when I lock". |
| Manual lock | Lock icon in the spine; `⌘⇧L` | |
| On lock | DK/RK references dropped, decrypted state cleared from stores, editors save encrypted drafts, the unlock card is shown in the current imprint's theme | Clearing JS memory is best-effort (the GC is not under our control). This is documented as a limit. |
| Failed attempts | Exponential delay after 5 wrong passphrases (local) | No lockout that could destroy data. |

**While locked, nothing personal is shown.** The house dashboard and imprints render only their unlock card. There is no "peek" view. (A future opt-in "show the shape of my lifeline while locked" would store only the birth year and horizon in plaintext, and is not in v1.)

## 5. Opaque record IDs

AMAZEEN's wire format uses readable record IDs (`e:<id>`, `meta`). ETERNALL replaces them with **`rid = base64url(HMAC-SHA256(RK, "<imprint>/<collection>/<id>"))[0..22]`**, and the logical path lives *inside* the ciphertext. The local store and the server can therefore no longer tell which imprints you use or how many records each holds. They see only a total count and sizes.

## 6. Sync (paid feature)

Sync is AMAZEEN's design, generalised to the whole vault:
- **Transport:** same-origin HTTPS to `services/sync-worker` (Cloudflare Worker + D1), with `Authorization: Bearer <AS>`. The server stores `SHA-256(AS)` as the vault ID.
- **Records:** `{ rid, updatedAt, deleted, blob }`; incremental pull by server change number; transactional batch push; newest-wins per record with tombstones; server clamps timestamps to now + 5 minutes.
- **Licence check:** a sync vault must be **bound** to an active licence (§8). The server checks the binding, never the content. Pushing needs an active licence (paid period + 14 days grace); pulling keeps working for 90 more days, so a lapsed patron can always bring their copy home.
- **Moving AMAZEEN in by sync key (F15 path 2):** `/api/legacy/amazeen/sync` is a read-only, GET-only door to AMAZEEN's old sync database. The journal is decrypted on the device with AMAZEEN's own keys and re-encrypted into the vault; the sync key never leaves the device.
- **What the server can see:**

| Can see | Cannot see |
|---|---|
| That a vault exists (hash of AS) | Any content of any imprint |
| Number of records, their sizes and change times | Which imprints are used (opaque rids) |
| Request IP and time (host logs) | Names, dates, moods, people, letters, titles |
| Which licence the vault is bound to (§8) | The Vault Key, Data Key, passphrase or passkey |

## 7. Recovery, devices, rotation

- **Recovery kit:** generated at vault creation. It is a printable/saveable page with the Recovery Key (text + QR), the vault's creation date, plain instructions, and **no other secret**. Creating the vault asks you to confirm you saved it (by typing 4 characters back, or explicitly choosing "I'll do it later", which triggers reminders).
- **Forgot passphrase:** unlock with the Recovery Key, then set a new lock method. Old wrapped copies are replaced.
- **Lose the passphrase *and* the recovery kit:**
  - Local data on an already-unlocked device can still be exported.
  - Otherwise **the data is unrecoverable**. This is stated at creation and in the kit itself. It is the cost of nobody else being able to read it.
- **Adding a device:** enter the Recovery Key on the new device (or scan the QR from an unlocked device's "Add a device" screen). The new device derives the same AS and syncs.
- **Rotation and revoking a device** (no per-device keys in v1):
  1. "Rotate vault key" generates a new VK, re-encrypts all records locally and creates a new sync vault.
  2. It uploads, deletes the old sync vault, and moves the licence binding to the new one.
  3. A new recovery kit is issued.

  Devices holding the old key lose sync access. This is the revocation mechanism, and the UI says so plainly.

  **As built (Release 1):** `Keyring.rotate` re-encrypts every record locally under a new VK and a new lock, the old cloud copy is deleted with the old AS, the new vault is registered with the same licence, and the new recovery kit is shown at once. `Keyring.adopt` is the add-a-device path: the same VK from the recovery key, wrapped with this device's own lock.

## 8. Licences without accounts

Sync and immersive modes require an active licence (`BUSINESS.md`). The licence design keeps **content** zero-knowledge and minimises **linkability**:

1. Checkout happens at the payment provider. Its webhook tells `sync-worker` a subscription is active and returns a **claim code** (single-use, short-lived) to the success page.
2. The app redeems the claim code: `POST /api/licence/claim { code }`. The worker returns a **licence token**, signed with ECDSA P-256: `{ v, lid, tier, exp, iat }` (`exp` already includes the 14-day grace). Codes are stored only as SHA-256 hashes, are single-use and expire after 24 hours.
3. The token is stored **inside the vault** (encrypted, synced). The app verifies it **offline** with the embedded public key, so immersive modes work offline until `exp`.
4. For sync, the vault presents its AS and the token (`POST /api/vault`). The server binds `vaultId ↔ lid`, **one vault per licence**; deleting the cloud copy (or rotating keys) frees the licence. As built, binding happens at registration rather than through a `bind` field in the token: it reveals the same link and is simpler to revoke.
5. Renewal: the provider webhook extends `lid`, and the app refreshes the token with `POST /api/licence/refresh`.

**What we can link, stated plainly:** the payment provider knows who paid, and our server knows *which licence* a sync vault uses. So with both datasets, a payer could be linked to a sync vault's existence and size, **never to its content**.
**Planned improvement:** unlinkable tokens via privacy-preserving blind signatures (RFC 9474 / Privacy Pass style), so the server can verify a licence without knowing which purchase it came from. This is tracked in `ROADMAP.md`.

## 9. A letter's seal: what "sealed" means (AMAZEEN · Letters, once ENVOI)

- A letter (still stored as `envoi/letter`) is encrypted like every record. The **time-lock is enforced by the app**: the UI will not reveal a letter before its date, and the letter carries a SHA-256 fingerprint verified on opening (exists today).
- This is a **promise of the interface, not of cryptography**. Someone with your Recovery Key and determination could extract a letter early. The ENVOI UI states this once, in plain words, at first use.
- **Future (optional):** a cryptographic time-lock via a public randomness beacon (drand/tlock), where the letter key is encrypted to a future beacon round, so even you can't open it early. This requires the network at opening and is designed but not in v1.
- **Future: letters to other people** (`MODULES.md` §3, "later").
  - Each letter gets its own random key, and the ciphertext is stored on the server with a release date.
  - The key travels **only in the link fragment** (`#k=…`), which never reaches the server.
  - Delivery is either *manual* (you hand over the link) or *server-delivered*, which requires storing the recipient's contact address. That is a disclosed privacy trade-off, and it is opt-in per letter.

## 10. Threat model

| Threat | Outcome |
|---|---|
| Server database leak or curious operator | Ciphertext + metadata in §6 only. Content unreadable. |
| Stolen device, vault **locked** | Content encrypted; passphrase/passkey required. Weak passphrase → offline guessing of the *local* wrap is possible (PBKDF2 600k slows it; recommend passkey). Device-only lock offers no protection here, as disclosed. |
| Stolen device, vault **unlocked** | Attacker sees what the owner sees until auto-lock. Mitigated by auto-lock timers. |
| Someone with access to the browser profile copies IndexedDB | Encrypted. With "device only" lock, the device KEK may be copyable with the profile; disclosed. |
| XSS / malicious script in the page | Could read decrypted data while unlocked. Mitigated by strict CSP, no third-party scripts, no `innerHTML`, and dependency minimalism. Residual risk acknowledged. |
| Server swaps, edits or moves records | AES-GCM + AAD → decryption fails; the client skips the record and says so. |
| Server replays or withholds records | Can roll back freshness or availability, not read or forge. (As AMAZEEN.) |
| Guessing a Recovery Key | 128 random bits: infeasible. |
| Malicious payment provider | Knows who paid; learns nothing about content. |
| Lost recovery kit + forgotten passphrase | Data unrecoverable (by design). |
| Coercion / legal request to us | We can hand over only ciphertext and the metadata in §6. |
| Someone glances at a locked phone while reminders are on | A system notification shows its title (e.g. "Dad’s birthday is today") on the lock screen. System notifications are off by default, opted into in Settings → Reminders with this warning, and only fire while ETERNALL is open. |
| Tab closed within milliseconds of a write | The last write can be lost: encryption is asynchronous, so there is no synchronous mirror (a plaintext one is forbidden). Writes flush on hide and close. |

### Retired imprints (ADR 0011)

Consolidating to four apps changed no keys, no encryption and no sync. Records of the retired imprints keep their paths and stay encrypted in the vault and in exports. The only new writes are house inscriptions created from PROLOGUE seasons and a migration log (`house/migrations`), both ordinary encrypted vault records. Each app's theme is scoped on `<body data-imprint>`, which carries only the app's id, never content.

### CASHEEN: money (ADR 0012)

- **Amounts never leave CASHEEN.** The house shows counts only (Almanac). Nothing about money reaches the lifeline, week panel or house search.
- **No bank connections and no outside service.** The quick line is read by plain rules on the device. Learned words (`ledger/words`) are ordinary encrypted vault records.
- **Your shorthand** (`ledger/terms`) and learned words (`ledger/words`) are ordinary encrypted vault records, read only on the device.
- **CSV imports** are read in memory on the device. The file is never stored, only the entries you choose to write.

### Local reminders and photos

- **Reminders** are computed on the device from vault data (`ImprintDefinition.reminders`), never scheduled on a server and never sent anywhere. The house delivers each one once: as an in-app toast, or, when the person turned on system notifications and the app is open in the background, through the service worker's `showNotification`. Which reminders were delivered is a vault record (`house/reminders`), so it is encrypted and syncs like everything else.
- **KINDRED photos** are chosen by the person, shrunk on the device (≤ 360 px, JPEG, ≤ 200,000 characters as a data URL), and stored as encrypted vault records (`kindred/photo`). The original file is never stored or uploaded; nothing is fetched from the internet.

## 11. AI policy

No AI features in v1. Any future AI feature must run **on-device**, must not transmit content, must be opt-in per feature, and must be documented here before it ships (ADR 0010).

## 12. Analytics and logging

- **No analytics, telemetry or crash reporting in v1.** Errors are shown to the person with a "copy details" option they can choose to send us.
- Worker logs are the host's standard request logs (IP, time, path, status), kept for the minimum period the host allows, and never containing record bodies or tokens.

## 13. Gaps in AMAZEEN v1.4, and how ETERNALL closes them

| AMAZEEN v1.4 | ETERNALL |
|---|---|
| Journal stored in plaintext in IndexedDB/localStorage | Encrypted at rest per record (§3) |
| No app lock | Passkey / passphrase / device lock + auto-lock (§4) |
| Raw sync key bytes stored in IndexedDB | Vault Key wrapped; only non-extractable keys in memory (§2) |
| Readable record ids (`e:<id>`) | Opaque HMAC rids (§5) |
| No rotation / revocation | Vault key rotation (§7) |
| Sync key = only secret, shown on demand | Recovery kit with confirmation; re-auth to show (§7) |

## 14. Review before Release 1

- [ ] Independent review of the key hierarchy, lock, sync and licence protocols.
- [ ] Known-answer tests for every crypto function, plus cross-browser runs (Chromium, WebKit, Firefox).
- [ ] CSP and headers verified on the production build.
- [ ] This document updated to match the implementation exactly.
