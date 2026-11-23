# ADR 0013 — AMAZEEN first, CASHEEN beside it, apps opt-in, one app bar

Status: Accepted · Date: 2026-11-24 · Amends: ADR 0011 (chrome anywhere), ADR 0012 (LEDGER, renamed CASHEEN) · See `docs/PRODUCT.md`

## Context
A product review argued that launching a suite of five apps, each with its own way of getting around, asks too much of a new person. The clearest problem the product solves is AMAZEEN's: people journal but rarely reread what they wrote. Money tracking is a separate, equally personal job that benefits from the same privacy. Earlier the owner had also asked each app to navigate from a different edge of the screen; in practice that made people relearn back, search and lock in every app.

## Decision
1. **AMAZEEN is the first product and the way in.** A new person's first screen leads to writing, with no profile or birth date asked.
2. **CASHEEN (formerly LEDGER) sits beside it as a parallel product**, labelled "Money", opened directly. The two are on by default (`DEFAULT_APPS` in `apps/web/src/house/domain/apps.ts`).
3. **The other apps are opt-in.** REFRAIN, KINDRED and MARGINALIA stay in the code, switched off for new vaults and switched on in Settings → Apps. A vault that already has data in an app keeps it on, with no record written. An off app's address shows a page that offers to turn it on; it does not open the app.
4. **The module picker uses plain labels**: Journal, Money, Practices, People, Reading, with the brand name as secondary text.
5. **Firm data boundaries.** CASHEEN contributes nothing to the house: no Almanac facts, no lifeline markers, memories, inscriptions or capabilities. AMAZEEN never reads money data.
6. **One app bar.** Every app puts the way back, its name, its places, search, the lock and its primary action in the same positions: one top bar on desktop; on a phone a top bar (back, name, search, lock) and a bottom bar (places and the raised primary action). The kit's headless `AppBar` owns positions and behaviour; each app owns its look through class hooks in its kit stylesheet. Colours, type, ornament, layout inside the page and animation still make each app its own (ADR 0011 otherwise stands).
7. **The lifeline is optional** and is never the first page for a new person.

## Consequences
- `house/settings/prefs` gains `apps` (chosen apps). Until a person chooses, the set is derived: the defaults plus every app with data, minus the legacy `hidden` list.
- The per-edge navigation (LEDGER's thumb-index rail, KINDRED's drawer dock, MARGINALIA's margin column) is removed. LEDGER's month notches move into the page.
- AMAZEEN's embedded desktop chrome moves from its left spine to the shared top-bar positions, and finally shows search and the primary action.
- Marketing and onboarding talk about the journal (and money), not about a suite or a lifeline.

## Alternatives considered
- **Launch every app** — too wide for marketing, navigation, testing and a first impression.
- **Money inside the journal** — mixes two jobs and two sensitivity levels; someone who only wants money would have to learn the journal.
- **Keep a different navigation per app** — memorable, but makes people relearn the basics in every app.
- **Leave hidden apps out of the build** — smaller bundles, but existing vaults with that data would lose access; opt-in in Settings keeps everything reachable.
