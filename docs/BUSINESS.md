# ETERNALL — Business model

Status: draft for review · Phase 0 · Related: `VISION.md`, `PRIVACY.md` §8, `FLOWS.md` F8–F10

---

## 1. Model: freemium with one bundle subscription

- **Free, forever:** every imprint, used locally, with no limits on entries, letters, chapters, people or works.
- **Paid: ETERNALL Patron**, a single subscription covering the whole house, for things that cost us money to run or that are premium craft:
  - **Sync**, end-to-end encrypted across devices.
  - **Immersive modes:** the 3D and sound experiences.
  - **Extra editions:** additional themes per imprint.

*Why "Patron":* publishing houses have long been sustained by patrons. The word says you are supporting the house, not unlocking basic dignity.

## 2. What's free vs Patron

| | Free | Patron |
|---|---|---|
| All imprints, unlimited, offline | ✓ | ✓ |
| Encryption at rest, app lock, recovery kit | ✓ | ✓ |
| Export / import (encrypted and plain) | ✓ | ✓ |
| Every imprint's signature moment **in 2D** (e.g. the drawing of a life, seal-and-post, curtain up, highlighter sweep, REFRAIN basic playback) | ✓ | ✓ |
| Accessibility features, both themes | ✓ | ✓ |
| Installable doors (PWA per imprint) | ✓ | ✓ |
| **Sync across devices** (E2EE) | — | ✓ |
| **Immersive modes:** life coil (ETERNALL), physical envelope (ENVOI), 3D bookshelf (FOLIO), mechanical orrery (ALMANACK), stage shader (PROLOGUE), 3D constellation (KINDRED), cabinet (MARGINALIA), turnable covers (AMAZEEN), richer instruments and year playback (REFRAIN) | — | ✓ |
| **Extra editions** (alternate themes per imprint, e.g. AMAZEEN "Broadsheet", ENVOI "Telegram", FOLIO "Paperback") | — | ✓ |
| Printed products (future: a printed yearly GAZETTE, bound AMAZEEN volumes) | — | à la carte |

**Never paywalled:** your data, export, encryption and lock, accessibility, and any imprint's core function. **Never sold:** your data, advertising, attention.

## 3. Pricing (owner decision; TODO)

Placeholders for the owner to decide:

| Plan | Price | Notes |
|---|---|---|
| Patron monthly | **TODO** | |
| Patron yearly | **TODO** (suggest ≈ 10× monthly) | Default selection |
| Founding Patron (first N months after Release 1) | **TODO** (suggest lifetime discount) | Rewards early believers |
| Regional pricing (e.g. IDR) | **TODO** | Purchasing-power parity via the payment provider |

**Existing AMAZEEN sync users** (sync is free in AMAZEEN today):
- Recommended: **12 months of Patron free** after migration, then Founding Patron pricing.
- *Owner decision; TODO.*

## 4. Payments and the anonymous licence

- **Provider:** a merchant of record that handles global tax and VAT (e.g. Paddle or Lemon Squeezy), plus local methods for Indonesia if needed (e.g. Xendit or Midtrans). **Owner decision; TODO.**
- **Flow** (protocol in `PRIVACY.md` §8, steps in `FLOWS.md` F8):
  1. Checkout happens at the provider.
  2. A claim code is returned to the app.
  3. The app redeems it for a signed licence token stored *inside the vault*.
  4. The token is verified offline and bound to the sync vault.
- **What ETERNALL holds:**
  - A licence id with tier and expiry.
  - The provider's subscription reference.
  - The binding to a sync vault ID.
  - **No email, name or address** (those stay with the provider, who needs them for receipts and tax).
- **Honesty:** the provider knows who paid. ETERNALL can link a licence to a sync vault's existence, but never to its content. Unlinkable blind tokens are on the roadmap.

## 5. Lifecycle

| Event | What happens |
|---|---|
| Subscribe | Patron features unlock immediately on the device that redeemed. Other devices pick up the token via sync (or by redeeming the same claim on a device without sync). |
| Renew | Automatic at the provider; the token refreshes in the background. |
| Payment fails | 14-day grace period with a calm in-app note. Everything keeps working. |
| Cancel / expire | **Your data is never touched and stays fully usable.** Sync pauses (the cloud copy is kept for **90 days**, then deleted after two in-app notices). Immersive modes fall back to 2D. Extra editions revert to the standard theme (the choice is remembered). |
| Resubscribe within 90 days | Sync resumes where it left off. |
| Refund | Per provider policy; the licence is revoked at the provider and expires at the next refresh. |
| Native apps (later) | App Store and Play Store builds must use in-app purchase for digital goods. The licence token format stays the same, issued after receipt validation. Pricing may differ to cover store fees (**TODO**). |

## 6. Costs and sustainability (rough model)

- **Free users cost almost nothing:** static assets from the edge and no server state.
- **Patron cost drivers:**
  - D1 storage and requests for sync (encrypted records; AMAZEEN quotas of 30k records and ~170 KB per record are a starting point; ETERNALL sets a per-vault quota, for example **1 GB**, **TODO**).
  - Worker invocations.
  - Payment fees.
- **Target:** Patron revenue covers infrastructure plus a sustainable development budget. Success metric in `VISION.md` §9.

## 7. Principles that constrain the business

1. **No dark patterns:** no fake urgency, no confirm-shaming, no hidden cancellation (cancellation is one click away in the provider portal, linked from Settings).
2. **Free means complete:** a free user never hits a wall in the middle of writing. Patron prompts appear only where a Patron feature is chosen (e.g. tapping "3D coil"), and once dismissed they don't repeat that week.
3. **No upsell inside sensitive moments:** never while writing, opening a letter or closing a season.
4. **Data outlives the subscription,** always.
