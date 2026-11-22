# ETERNALL — Flows

Status: draft for review · Phase 0 · Related: `ARCHITECTURE.md` §2, `PRIVACY.md`, `BUSINESS.md`

Each flow lists **steps**, then **states and edge cases**. "Imprint X" means any imprint. Copy in quotes is indicative; final copy follows `BRAND.md` §6.

---

## F1 · First arrival through an imprint's door
1. Visitor opens `eternall.app/envoi/` (link, search, marketing domain redirect, or installed icon).
2. The shell boots in **focus mode** with ENVOI's theme. ENVOI's onboarding runs in ENVOI's idiom (a blank sheet on a desk, with one sentence on what ENVOI is).
3. On the first *meaningful write* (sealing a letter), the vault is created inline (**F2**). ENVOI does not ask for anything before the person has tried it.
4. The first-contact metaphor hint is shown once, skippable.

**States and edge cases**
- *Storage blocked* (private mode, or IndexedDB denied): a banner in the imprint's style: "This browser won't let ETERNALL save. You can look around, but nothing will be kept." Writes are disabled, never silently lost.
- *Old browser* (no Web Crypto, no IndexedDB): a "Your browser can't keep things private" page with supported-browser guidance.
- *Visitor arrives at the house `/` first:* the house onboarding offers the doors ("Start with a journal, letters to your future, or your life in weeks") and never forces the lifeline.

## F2 · Creating the vault and choosing a lock
1. Triggered by the first meaningful write in any imprint (or explicitly from the house).
2. A sheet in the current imprint's theme: "Before we keep this, let's lock it to you."
3. Options: **Use a passkey** (shown only if WebAuthn PRF is supported) · **Set a passphrase** · **Skip for now** (device key, with its honest limit in one line).
4. A Vault Key is generated, the chosen lock wraps it, and the pending write is encrypted and saved.
5. Continue to **F3**.

**States and edge cases**
- Passkey PRF not available → passphrase is the first option.
- Passphrase strength meter (length-based, ≥ 10 characters suggested); weak passphrases are allowed with a clear warning, never blocked.
- If the person abandons the sheet, the pending write is held in memory only, and the sheet reappears on the next attempt to leave the page (`beforeunload`) and on next write.
- Crypto failure → the write is kept in the editor, never lost ("Couldn't create a private vault in this browser").

## F3 · Recovery kit
1. Immediately after F2: "Your recovery key is the only way back in if you forget your passphrase or lose this device."
2. Shows the Recovery Key, with buttons **Print**, **Save as file** and **Copy**.
3. Confirm by typing back 4 indicated characters, or "I'll save it later" (allowed).
4. "Later" sets reminders: on the 3rd day of use and the 7th, then monthly, in the doors menu and Settings, until confirmed.

**Edge cases:** printing is unavailable inside some installed PWAs, so file save is offered. Copy to clipboard is followed by an automatic clipboard clear after 60s (best-effort).

## F4 · Unlock and auto-lock
1. Opening any door while locked shows the **unlock card in that imprint's theme**.
2. Passkey → biometric prompt; passphrase → field; "Use recovery key" link.
3. On success, the person lands exactly where they were (route and scroll restored).
4. Auto-lock after inactivity or after the tab is hidden (`PRIVACY.md` §4). Editors save encrypted drafts first.

**Edge cases**
- 5 wrong passphrases → an increasing delay with countdown, and never a data wipe.
- Locked in one tab → all tabs lock (BroadcastChannel).
- Unlock while offline works fully (local only).

## F5 · Discovering a second imprint
1. A contextual, dismissible suggestion appears **inside** an imprint when it helps. Examples:
   - AMAZEEN, after a cover story: "Seal this week's cover story as a letter to next year? → ENVOI".
   - FOLIO, after naming a chapter: "Keep the people from this chapter close → KINDRED".
2. Tapping opens the other imprint's door **with context** (e.g. a pre-filled letter), and its onboarding is shortened because the vault exists.
3. Dismissing hides that suggestion permanently. At most one suggestion per imprint per week.

**Edge cases:** suggestions never appear while writing, while a ceremony is playing, or in the first 3 days of using an imprint.

## F6 · Binding: the house dashboard offered
1. When a second imprint gets its first record, the doors menu shows once: "You're keeping more than one thing now. See it all on one page? → Your lifeline".
2. Opening the lifeline for the first time asks **only now** for: name (pre-filled from imprint data if present, e.g. AMAZEEN's editor name), birth date, and horizon (default 90).
3. The reveal ceremony ("the drawing of a life", existing) plays, and contributions from all imprints appear on their weeks.

**Edge cases:**
- The person declines → the invitation never auto-appears again, and the lifeline stays reachable from the house mark.
- Birth date is validated against existing records (any record before birth produces an inline warning, not a block).

## F7 · Installing an imprint as its own app
1. On a door, the browser's install prompt (or a subtle "Install AMAZEEN" item in the doors menu) installs **that imprint**, with its name, icon and `scope`.
2. The installed app opens in focus mode. The house mark still offers the doors (they open within the same installed window when in scope, or in the browser otherwise).

**Edge cases:** iOS needs "Add to Home Screen" instructions per imprint, so each manifest carries its own `apple-touch-icon` and title.

## F8 · Becoming a Patron
1. Entry points:
   - Choosing a Patron feature (e.g. "3D coil", "Turn on sync").
   - Settings → Patron.
   - Never a pop-up during writing (`BUSINESS.md` §7).
2. A Patron sheet in the house style: what you get, the price, and "Your data stays yours either way".
3. **Continue to checkout** opens the provider's checkout (new window/tab).
4. On success, the provider redirects to `/patron/claim?code=…`. The app (if unlocked) redeems the code → licence token stored in the vault → "Welcome, Patron."
5. If the app was locked or closed, the claim page asks to unlock first, and the code stays valid for 24 hours.

**Edge cases:**
- Claim code already used → "This code was already redeemed. If that wasn't you, contact us with your receipt."
- Offline at claim → queued; the person is told the redemption will finish when back online.
- Redeemed on a device without sync, then later on another device → "Restore purchase" accepts the provider receipt email lookup *at the provider*, which returns a fresh claim code (ETERNALL never sees the email).

## F9 · Turning on sync and adding a device
1. Settings → Sync (Patron). "Turn on sync" → the vault registers with the server (`AS`), binds the licence, and pushes all records.
2. **Add a device:** on the new device, open any door → "I already have an ETERNALL vault" → enter the Recovery Key, or scan a QR from an unlocked device's "Add a device" screen.
3. The new device derives keys, pulls records, then asks to set **its own** local lock method (lock methods are per device).

**Edge cases:**
- Wrong key → checksum error before any network call (keyphrase checksum).
- A record fails to decrypt (tampering or corruption) → skipped and reported: "1 item couldn't be read and was skipped."
- Quota reached → sync pauses with an explanation. Nothing local is affected.
- Device clock wrong → server clamp, plus a gentle "Your device clock seems off" note when the skew exceeds 5 minutes.

## F10 · Renewal, payment failure, expiry
1. Renewal is silent, and the token refreshes in the background.
2. Payment failure → 14-day grace period with a calm note in Settings and the doors menu.
3. Expiry → sync pauses, immersive modes fall back to 2D, editions revert. A notice explains the cloud copy is kept for 90 days. Reminders follow at day 60 and day 85.
4. Resubscribe within 90 days → resumes. After 90 days the cloud copy is deleted (local data untouched).

## F11 · Forgot passphrase
1. Unlock card → "Use recovery key" → enter the key → set a new lock method → old wraps replaced.
2. Without the recovery key: if any device is still unlocked, it can export or create a new recovery kit (after re-auth). Otherwise: "We can't open this vault without your passphrase or recovery key. Nobody can — that's what keeps it private." The person is offered to start a new vault, **without deleting** the old one (in case they find the key later).

## F12 · Rotate key / revoke a device
Settings → Security → "Rotate vault key" → explanation (other devices will need the new key) → re-encrypt locally with a progress indicator → new sync vault → licence binding moved → old cloud vault deleted → new recovery kit (F3). Interrupted rotation resumes safely, because the old key and data are kept until the new vault is fully uploaded and verified.

## F13 · Export
- **Encrypted archive** (`.eternall`, default): the whole vault, decryptable with the Recovery Key. It is the best backup.
- **Plain export** per imprint (JSON, plus imprint-specific formats: AMAZEEN issues as print/PDF, ENVOI opened letters as text, MARGINALIA underlines as Markdown). A clear warning: "This file isn't encrypted."
- **Backup reminder:** if there is no sync and no export in 30 days, a calm reminder appears in the doors menu (generalising AMAZEEN's 14-day reminder).

## F14 · Erase
- **Per imprint:** Settings → Imprint → "Erase all ENVOI data" (type the imprint name to confirm). Sealed letters are destroyed unread, and this is warned.
- **Whole vault:** type your name, or "ERASE", to confirm. This removes the local vault, all drafts and mirrors, and (if synced) the cloud vault after one more confirmation. The licence stays valid at the provider.
- The dialog waits until storage is actually wiped before closing (AMAZEEN audit finding #3).

## F15 · Migration for existing AMAZEEN users
AMAZEEN lives on another origin today, so its IndexedDB can't be read from `eternall.app` directly. There are three paths, in order of preference:
1. **One-click move (AMAZEEN v1.5 release):** AMAZEEN shows "AMAZEEN is moving to its new home". **Move my journal** opens `eternall.app/amazeen/import` in a popup. The two windows exchange data with `postMessage` (strict origin checks both ways, a one-time nonce). ETERNALL creates a vault (F2/F3), imports and encrypts. On success AMAZEEN shows "Moved", offers to keep or clear the old local copy, and from then on redirects to the new door.
2. **Via AMAZEEN sync** *(ships with the sync-worker in Release 1)*: if the user had sync, entering their AMAZEEN sync key in ETERNALL's importer pulls the old account, decrypts it with the old derivation (`amazeen/sync/v1` salt) and re-encrypts it into the vault.
3. **Via export file:** AMAZEEN's existing JSON export (format v2) is imported through `migrate()` and `parseAppData()` logic carried into `modules/amazeen`.

After migration the AMAZEEN experience is the same (focus mode, AMAZEEN-first). A one-time note explains the new spine and the lock. Grandfathered Patron period per `BUSINESS.md` §3.

**Edge cases:**
- Popup blocked → fall back to a link plus the export-file path.
- Partial import → transactional: everything or nothing, with a retry.
- Duplicate import → merge newest-wins, with no duplicates (ids preserved).

## F16 · Opening an ENVOI letter
1. On the opening day: a "ready" marker on the lifeline week, in ENVOI's pigeonholes and in the doors menu (badge). A local notification fires only if the person opted in.
2. ENVOI → the focal letter → **Break the seal** → ceremony (2D or 3D) → fingerprint verified → letter shown → `openedAt` saved.

**Edge cases:**
- Device clock set forward to open early → the app uses the device date (local-first). The `PRIVACY.md` §9 honesty note applies; with sync, a server-provided date check gently notes a skew.
- Fingerprint mismatch → the letter is shown with the tamper warning.

## F17 · Storage full or evicted
- A write fails (quota) → the editor keeps the text and shows "This device is out of space for ETERNALL. Export a backup or free space; your text is safe here." It retries on the next write.
- Eviction detected on boot (vault missing but the mirror stamp exists) → "Some data seems to have been cleared by your browser" with restore options: sync, encrypted archive, recovery.

## F18 · Several tabs and installed windows
All tabs share one vault. Changes broadcast via BroadcastChannel, and lock and unlock propagate. An imprint open in two tabs shows live updates, and simultaneous edits to the same record resolve newest-wins with a non-blocking "Updated in another window" note.

## F19 · Offline
Everything except sync, licence refresh and checkout works offline. Sync and licence work queues and resumes. The spine shows a small, quiet offline indicator only when something is waiting to sync.
