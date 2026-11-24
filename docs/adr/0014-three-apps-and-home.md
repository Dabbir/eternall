# ADR 0014 — Three apps and Home

Status: Accepted · Date: 2026-11-24 · Amends: ADR 0011 (four apps, the house dashboard), ADR 0013 (launch scope) · See `docs/PRODUCT.md`

## Context
Five apps were still too many to explain. MARGINALIA overlapped with the journal: an underline is a quote, and AMAZEEN already keeps quotes. KINDRED's people mostly mattered in what was written about them, which happens in AMAZEEN. REFRAIN's musical score was charming but hard to read at a glance. The house dashboard (a life in weeks, with inscriptions, chapters and an almanac) was the most abstract page in the product, yet it was the first one people saw.

The owner also wants every app to offer personal looks like AMAZEEN's, each within its own world.

## Decision
1. **Three apps:** Journal · **AMAZEEN**, Money · **CASHEEN**, Practices · **ROUTEEN**. All three are on by default; Journal is always on.
2. **MARGINALIA is retired.** Each underline becomes an AMAZEEN quote (passage, "By, Title, locator", the margin note as a second paragraph); a finished work without underlines becomes one short note. The migration is idempotent and logged in `house/migrations`. `/marginalia/*` redirects to AMAZEEN's Shelf. The `quotes.offer` capability and AMAZEEN's "Overheard" go with it.
3. **KINDRED becomes AMAZEEN · People** (`/amazeen/people`): the newsroom's wall of sources, cards pinned above the shelf. Cards, dates and reminders, photos and "seen" stay; the constellation and drawers go; new: "Appears in N pieces". The `people.mention` capability becomes internal to AMAZEEN. `/kindred/*` redirects.
4. **REFRAIN becomes ROUTEEN** ("routine" + the -EEN of its siblings): **the loom**. Each practice is a thread, each day weaves a row; a missed day leaves the bare warp showing, never a broken streak. Audio is removed. `/refrain/*` redirects.
5. **Data never moves.** `kindred/*`, `refrain/*` and `marginalia/*` keep their paths; originals stay in the vault and in exports. Settings saved under old ids are read under the new ones.
6. **Personal looks for every app**, on one engine (`packages/core/src/look.ts`, `packages/kit/src/look.tsx`). Each app declares presets, accents, type pairings, sizes and densities true to its concept; every combination is tested for contrast. Looks change tokens, never layout; light and dark stay with the house; looks live in the vault.
7. **Home replaces the house dashboard** at `/`: one card per app with a status line and one action. **Money shows no figures on Home.** Home is also the first page for a new person.
8. **"Your life in weeks"** (`/life`) keeps the lifeline, with Chapters and Inscriptions as its sections and the Almanac folded in as a summary. It stays optional.

## Consequences
- AMAZEEN grows a People room and absorbs KINDRED's records, reminders and lifeline marks.
- Fonts only the retired apps used are removed (Bodoni Moda, Bravura, Libre Franklin, Caveat, IBM Plex Mono). ROUTEEN reuses Young Serif, Work Sans and Literata, so no new dependency is added.
- `ImprintDefinition` gains `home?(ctx)` for Home's cards. CASHEEN's contains no figures, and a test asserts it.
- `/inscriptions`, `/chapters`, `/almanac` and `/welcome` redirect into `/life` or `/`.

## Alternatives considered
- **Keep MARGINALIA and KINDRED opt-in** — still five apps to maintain, explain and test.
- **Keep REFRAIN's score** — distinctive, but a week of practice should read at a glance.
- **Rename ETERNALL too** — a larger brand decision with trademark and domain checks; out of scope here.
