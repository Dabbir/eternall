# ADR 0008 — Freemium bundle with an anonymous, vault-bound licence

Status: Proposed · Date: 2026-11-22

## Context
The business needs revenue, but the product has no accounts and promises zero-knowledge content.

## Decision
- All imprints are free locally. **ETERNALL Patron** is one subscription for sync, immersive modes and extra editions (`BUSINESS.md`).
- Payments go through a merchant-of-record provider.
- After checkout, a single-use claim code is redeemed for an ECDSA-signed licence token, stored inside the vault, verified offline, and bound to the sync vault (`PRIVACY.md` §8).
- ETERNALL stores no email or name.

## Consequences
- Content stays zero-knowledge. The provider knows payer identity, and the server can link a licence to a sync vault's existence (disclosed).
- Restoring a purchase goes through the provider, which issues a fresh claim code.
- Native store builds will need in-app purchase, but the same token format applies.

## Alternatives considered
- **Email accounts:** contradict the privacy model. **Per-imprint subscriptions:** more complex, and against the "one house" idea.
- **Blind-signature tokens now:** deferred as an improvement (roadmap).
