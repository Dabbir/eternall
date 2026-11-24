# ETERNALL — Roadmap

Status: accepted · Phases 0–8 done, Phase 9 in progress (ADR 0014) · Each phase ends with its exit criteria met, then a review, before the next begins.

---

## Phase 0: Foundation documents (now)
**Deliverables:**
- `VISION`, `BRAND` and `DESIGN`, plus `design/*` (9 imprints).
- `ARCHITECTURE`, `PRIVACY`, `BUSINESS`, `FLOWS`, `MODULES` and `ROADMAP`.
- ADRs 0001–0010 and `CLAUDE.md`.

**Exit criteria:**
- The owner approves all documents.
- The current ETERNALL app is untouched (46/46 tests) and the AMAZEEN repo is untouched.

## Phase 1: Monorepo skeleton
**Deliverables:**
- npm workspaces and TS project references, aligned to the AMAZEEN toolchain (React 19, Vite 8, TS 7, oxlint, Vitest, Playwright + axe).
- `packages/core` from ETERNALL `src/domain`, with tests moved.
- `packages/ui` primitives, stripped of visual styles.
- `apps/web` shell: spine, doors menu, router, View Transitions, multi-page doors, per-door manifests, one service worker.
- The current ETERNALL features running inside the shell (still on localStorage for now).
- Imprint contract types and the capability registry.
- CI: lint, types, unit, e2e and axe, plus the bundle budget script.
- The `--ink-3` contrast correction (`design/eternall.md`).

**Done (2026-11-22):** besides the skeleton, the 2D designs of ENVOI, FOLIO and ALMANACK (`docs/design/*`) were pulled forward into this phase so their UI is written once; Phase 4 keeps their 3D modes. The old app's data migrates automatically from `eternall:archive`.

**Exit criteria:**
- All existing behaviour is reproduced, and the existing tests pass in the new locations.
- Each door URL serves its own manifest, and the house is installable.
- Budgets are green.

**Risks:**
- *React 18→19 changes.* Mitigation: run the existing test suite first.
- *Multi-page plus SPA routing complexity.* Mitigation: spike in week 1.

## Phase 2: The vault
**Deliverables:**
- `packages/vault` built from AMAZEEN's `crypto.ts`, `keyphrase.ts`, `idb.ts` and storage mirror. It provides:
  - the key hierarchy, encryption at rest and opaque rids;
  - lock methods (passkey PRF, passphrase PBKDF2, device) and auto-lock;
  - the recovery kit;
  - the encrypted archive export;
  - multi-tab sync of state.
- Migration of `eternall:archive` from localStorage into the vault.
- Flows F2–F4, F11, F13, F14, F17 and F18.

**Done (2026-11-22):** `packages/vault` holds the key hierarchy, opaque rids, encrypted store, keyring (passkey PRF, passphrase PBKDF2-600k, device key), recovery kit, sealed `.eternall` archive, auto-lock and tab sync. Verified end to end in jsdom (fake IndexedDB) and Chromium; WebKit and Firefox runs move to the Release 1 regression.

**Exit criteria:**
- Known-answer crypto tests pass in Chromium, WebKit and Firefox.
- No plaintext content in IndexedDB or localStorage (verified by an e2e storage inspection test).
- Lock and unlock work in all doors.

**Risk:** WebAuthn PRF support varies. Mitigation: a capability-driven UI with passphrase fallback.

## Phase 3: AMAZEEN joins
**Deliverables:**
- `git subtree add` of AMAZEEN into `modules/amazeen`, adapted to the imprint contract and the vault.
- Shared spine and masthead strip (`design/amazeen.md` §6), the `/amazeen/` door and manifest, and the lifeline contribution.
- AMAZEEN e2e and axe suites green in isolation.
- The **F15 migration** importer: postMessage handoff, via-sync and via-file paths.
- AMAZEEN v1.5, released in its own repo, with the "Move my journal" button (the only change made to the original repo, made by the owner or with explicit approval).

**Done (2026-11-22):** AMAZEEN imported with its history (`git subtree`), running inside ETERNALL with its own screens and look, the shared spine plus its masthead strip, and the vault (one encrypted record per entry). Paths 1 (one-click handoff, `/amazeen/import`) and 3 (export file, via AMAZEEN's own Office import) work. The v1.5 handoff patch is in `docs/patches/` for the owner to apply. Path 2 (via AMAZEEN sync key) ships with the sync-worker in Release 1.

**Exit criteria:**
- A real AMAZEEN v1.4 archive migrates losslessly via all three paths.
- The AMAZEEN experience is visually and functionally intact apart from the documented spine change.

## Phase 4: Release-1 imprints re-made + immersive modes
**Deliverables:**
- **ENVOI, FOLIO and ALMANACK** rebuilt as imprints with their own designs (`design/envoi.md`, `folio.md`, `almanack.md`). This replaces today's Capsules, Chapters and Almanac screens, and includes the bookcloth palette correction.
- House lifeline refinements, `packages/stage`, and the 3D life coil.
- 3D envelope, 3D bookshelf, mechanical orrery and AMAZEEN turnable covers.

**Done (2026-11-22):** `packages/stage` (capability gate, render on demand, frame-time downgrade, theme colours, Flat/3D toggle) and four three.js scenes — the life coil, ENVOI's breaking seal, FOLIO's bookshelf, ALMANACK's mechanical orrery — plus AMAZEEN's tilting covers in CSS 3D. three.js loads only when a 3D view opens (167 KB gzip). **Still open:** the 5-person comprehension tests (owner-run), visual regression snapshots, and frame-budget checks on the reference GPU laptop (the development browser renders WebGL in software, so it correctly falls back to 2D; `?nobudget` in dev keeps 3D on for visual checks).

**Exit criteria:**
- Each imprint passes its 5-second and 3-task tests with at least 5 people.
- Every 3D mode has an equivalent 2D mode that passes the same e2e tasks.
- Frame budgets are met on the reference device, and the axe suite is green.

## Release 1: ETERNALL + AMAZEEN + ENVOI + FOLIO + ALMANACK
**Deliverables:**
- `services/sync-worker`, generalised from AMAZEEN: records, licences, quotas, rate limits.
- Payment provider integration and Patron flows (F8–F10).
- Sync and add-device (F9), key rotation (F12).
- Production CSP and headers, independent privacy review (`PRIVACY.md` §14).
- Trademark and domain checks (`BRAND.md` §8).
- AMAZEEN domain redirect plan.

**Built (2026-11-22):**
- `services/sync-worker`: one Worker serving the app (door fallbacks) and `/api/*` (vaults, sync, licences, dev checkout, signed webhook, read-only AMAZEEN legacy door), on D1. Tested on real SQLite, including two devices syncing through the real handler and the server holding only ciphertext.
- Client sync engine (`syncOnce`, `SyncProvider`), Settings → Sync, "I already have a vault" (F9), key rotation (F12), the Patron page with checkout and claim (F8), immersive modes gated by the licence (dev builds count as Patron).
- F15 path 2: moving an AMAZEEN journal in with its sync key.
- PWA: one service worker for every door (`injectManifest`), update prompt, production `_headers` (CSP, HSTS).
- Run locally: `npm run dev:api` (wrangler on :8788, proxied by Vite at `/api`).

**Still the owner's (cannot be done in code):** payment provider and prices, trademark and domain checks, the independent privacy review, a real-device regression on WebKit, Firefox, Android and iOS, and creating the D1 database.

**Exit criteria:**
- The privacy review is done with findings resolved.
- Pricing is decided (`BUSINESS.md` §3).
- A full regression on Chromium, WebKit, Firefox, Android and iOS passes.

## Phase 5: Release-2 imprints
**Deliverables:**
- **REFRAIN, PROLOGUE, KINDRED and MARGINALIA**, built design-first from their docs, with capabilities wired: `people.mention`, `quotes.offer`, `rituals.week`, `letters.compose`.
- Immersive modes: REFRAIN instruments and year playback, PROLOGUE stage shader, KINDRED 3D constellation, MARGINALIA cabinet.

**Exit criteria:**
- Same quality gates as Phase 4.
- Every capability degrades cleanly when its provider is disabled (e2e matrix).

**Done (2026-11-23):** all four imprints, each with its own theme, layout and signature moment, built from `docs/design/*.md`:
- **REFRAIN:** the score as SVG with Bravura glyphs (notes placed by pitch, neutral rests, double bars at month turns), one-question-per-step ritual editor, “Mark today” sheet, synthesized Web Audio playback with a silent playhead fallback, programme notes with the year in one line; the year as a piece (richer instruments for Patrons).
- **PROLOGUE:** proscenium with Cast and Notes wings, curtain-up once per season with the typed title, script-format acts with humane states, epilogue that lowers the curtain, the lobby of playbills; the stage-lights shader (immersive).
- **KINDRED:** letterpress cards in overlapping drawers that fan out, the pressed card on “I saw them today”, card flip with dates and the shared timeline (resolved at read time), the 2D star chart with a sortable list; the constellation in the round (immersive).
- **MARGINALIA:** catalogue drawers of edge-on index cards (author ranges with surname particles, title, year, kind), the annotated page with an anchored margin and the highlighter sweep, every underline by year; the oak cabinet in CSS 3D (immersive).
- Capabilities wired with a with/without matrix in tests; the lifeline draws ritual, person, work and season signals.
- Finished after the first pass (2026-11-23): KINDRED photos (shrunk on the device, encrypted), opt-in local reminders for dates (the house delivers them; `FLOWS.md` F20), and AMAZEEN's own `@` mention picker in stories and notes. PROLOGUE now shows a planned season "in rehearsal" when none is running.

## Phase 6: Four apps, each its own site (ADR 0011)
**Why:** after Release 2, the owner asked for fewer modules (keep what's truly useful, like journaling), and for each module to feel like its own app, with no resemblance to ETERNALL.

**Done (2026-11-23):**
- **Consolidation (8 → 4).**
  - ENVOI became AMAZEEN's Letters room.
  - FOLIO and ALMANACK became house pages (Chapters, Almanac) as house sections.
  - PROLOGUE was retired, with each season kept as an inscription.
  - No data moved, and old links redirect.
- **Apps as their own sites.**
  - The shell renders an app bare and swaps the tab icon, theme colour and manifest.
  - Primitives are skinnable through tokens.
  - Each app has its own chrome, its own kit stylesheet, its own unlock card and its own icons: AMAZEEN's magazine spine, REFRAIN's score head, KINDRED's card cabinet, MARGINALIA's catalogue card.
- **Verified** with typecheck, lint, unit and integration tests, and budgets. In the browser: each app at 390 and 768px and desktop, light and dark, with reduced motion; its own unlock card; ⌘K scoped to the app; exit and Back; the house unchanged.
- **Still open:** a real-device pass (iOS install icons per door, Android maskable icons), and the owner's 5-second test on the four chromes.

## Phase 7: LEDGER (ADR 0012)
**Done (2026-11-23):**
- **A fifth app for personal money.** Its selling point: writing an entry is one line ("kopi 25rb", "gaji 8jt", "grab 32.500 kemarin"), read on the device, with a live preview where every part is one tap to correct. Corrections are learned, frequent entries become chips, and several lines can be pasted at once.
- **Monthly budget**, with plainly written overs.
- **Categories** you can rename, put away and add.
- **CSV import** with column mapping and a preview.
- **Opt-in reminder** on the 1st.
- **Its own site:** chrome, kit, lock card, icon, and a manifest with an "Add an entry" shortcut.
- **Amounts stay inside LEDGER**; the Almanac shows counts only.
- **Verified:** 21 domain tests and 7 integration tests; in the browser at 390px and desktop, light and dark.

*Each app navigating from its own edge (2026-11-23) was replaced by one app bar in Phase 8 (ADR 0013).*

## Phase 8: AMAZEEN first (ADR 0013, `PRODUCT.md`)
**Goal:** a launch that is easy to understand. AMAZEEN is the way in, LEDGER (renamed **CASHEEN**, labelled *Money*) sits beside it, and the other apps wait in Settings.

**Steps, one commit each:**
1. Docs: `PRODUCT.md`, ADR 0013, `AGENTS.md` in sync with `CLAUDE.md`.
2. Rename LEDGER → CASHEEN. Door `/casheen/`, `/ledger/*` redirects, collection paths stay `ledger/*`.
3. Journal and Money on by default; REFRAIN, KINDRED and MARGINALIA opt-in in Settings → Apps; a vault with data in an app keeps it on; new people land in AMAZEEN or CASHEEN, never the lifeline; CASHEEN contributes nothing to the house.
4. One app bar: the same positions for back, name, places, search, lock and the primary action in every app. Replaces the per-edge navigation of 2026-11-23.
5. AMAZEEN personal looks: presets plus accent, typeface, text size and density, stored in the vault.

**Done (2026-11-24),** steps 1–5 as five commits.

**Exit criteria (met):** a fresh vault starts writing in one tap with no lifeline; existing vaults lose no app; every app passes the same-positions test at 390/768/1440; looks never touch `localStorage`; all gates green.

**Order after launch:** AMAZEEN's core flow is tested with prospective users first (`PRODUCT.md`, next steps). CASHEEN grows only within quick entry and the monthly budget. REFRAIN is the next companion, then the others, only when people ask for them.

## Phase 9: Three apps and Home (ADR 0014)
**Steps, one commit each:**
1. Docs: ADR 0014, `design/routeen.md`, product, vision and brand.
2. Retire MARGINALIA: underlines become AMAZEEN quotes (migration `marginalia`), Overheard and `quotes.offer` go, `/marginalia/*` redirects.
3. KINDRED becomes AMAZEEN · People (`/amazeen/people`), data paths kept, `/kindred/*` redirects.
4. REFRAIN becomes ROUTEEN, the loom (`/routeen/`), data paths kept, audio removed, `/refrain/*` redirects.
5. Personal looks for every app on one engine (`packages/core/src/look.ts`, `packages/kit/src/look.tsx`).
6. Home at `/` (no money figures) and "Your life in weeks" at `/life`.

**Exit criteria:** the existing vault shows every underline, person and practice in its new home; old addresses land in the right place; a fresh vault opens on Home; every app's looks pass the contrast tests; all gates green; checked at 390/768/1440, light and dark.

## Release 2
All apps and the house. After the launch of AMAZEEN and CASHEEN.

## Later (designed, not scheduled)
- **Native apps** via Capacitor (ADR 0009): App Store and Play Store, in-app purchase licences, native notifications.
- **ENVOI to other people** (`PRIVACY.md` §9), with an optional drand time-lock.
- **Unlinkable licence tokens** (blind signatures).
- **Argon2id** KDF via WASM.
- **On-device AI** experiments under ADR 0010 (e.g. a yearly reflection drafted locally).
- **Indonesian** localisation.
- **Printed products** (GAZETTE yearly review, bound AMAZEEN volumes).
- **Future imprints** from the reserved names (`BRAND.md` §2).
