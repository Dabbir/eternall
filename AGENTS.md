# AGENTS.md — ETERNALL

ETERNALL is **a private publishing house for your life**. It is one local-first, end-to-end-encrypted platform made of **imprints**, each a complete product with its own name and visual world: **AMAZEEN** (journal), **ENVOI** (letters to your future), **FOLIO** (chapters), **ALMANACK** (measures), **REFRAIN** (rituals), **PROLOGUE** (seasons), **KINDRED** (people) and **MARGINALIA** (reading). They are bound together by the house **lifeline**, a life shown in weeks. Read `docs/VISION.md` first.

## Current state (read this before changing anything)

- **Phase 0 (documents) is in review.** No platform code exists yet. **Don't start Phase 1 work until the owner approves the docs** (`docs/ROADMAP.md`).
- This repo currently contains the **original single-app ETERNALL** (Vite + React 18, `src/`). It becomes `apps/web` + `packages/*` + `modules/*` in Phase 1 (`docs/ARCHITECTURE.md` §10).
- **AMAZEEN lives in `~/orca/amazeen-app`. Never modify it in place.** It is imported via `git subtree` in Phase 3 (`docs/adr/0006`). Changes to it need the owner's explicit approval.

## Commands

Current app (until Phase 1):
```bash
npm run dev        # Vite dev server
npm test           # Vitest (46 tests)
npm run typecheck  # tsc -b
npm run build      # typecheck + production build
```
After Phase 1, commands run per workspace (`npm run <script> -w <workspace>`) and from the root (`npm test`, `npm run lint`, `npm run test:e2e`, `npm run build`). Update this section when that lands.

## Docs map

| Need | Read |
|---|---|
| Why / what / for whom | `docs/VISION.md` |
| Names, voice, logo | `docs/BRAND.md` |
| Shared design rules, spine, 3D, budgets | `docs/DESIGN.md` |
| One imprint's look and layout | `docs/design/<imprint>.md` |
| Structure, imprint contract, data flow, tests | `docs/ARCHITECTURE.md` |
| Keys, lock, sync, licence, threat model | `docs/PRIVACY.md` |
| Free vs Patron, payments | `docs/BUSINESS.md` |
| Step-by-step user flows and edge cases | `docs/FLOWS.md` |
| Entities and contributions per imprint | `docs/MODULES.md` |
| Phases and exit criteria | `docs/ROADMAP.md` |
| Why a decision was made | `docs/adr/` |

## Rules (non-negotiable)

1. **Local-first.** Every imprint works offline. The network is only for sync, licence and checkout.
2. **All data goes through the vault.** Imprints never touch IndexedDB, `localStorage` or `fetch` directly. Use `ctx.vault` and `ctx.net`.
3. **Imprints never import each other.** Cross-imprint features use capabilities (`ARCHITECTURE.md` §5) and must degrade cleanly when the provider is missing.
4. **Every imprint works standalone**: no other imprint loaded, no lifeline profile.
5. **Domain logic is pure TypeScript with tests** (`modules/<id>/src/domain/`, `packages/core`). Every exported domain function has a test.
6. **Never weaken privacy:** no plaintext content at rest, no third-party scripts, analytics or CDNs, and no cloud AI on user content (`docs/adr/0010`). If a change touches keys, the lock or sync, update `docs/PRIVACY.md` in the same change.
7. **No new runtime dependency without an ADR.** The current allow-list is React, `@fontsource/*`, `three` (lazy 3D chunks only) and `vite-plugin-pwa`.
8. **Design: bold on the surface, clear in the hand.**
   - Follow the imprint's `design/*.md` spatial system, palette and motion.
   - Never use a forbidden pattern (`DESIGN.md` §1.2).
   - Action labels are plain words, and imprint names always carry their function line.
9. **Every 3D or audio moment has a complete 2D equivalent.** 3D chunks are lazy, render on demand, and pass through `packages/stage`.
10. **Accessibility is a gate:** WCAG 2.1 AA, keyboard paths, reduced motion, and validated palettes (contrast + CVD).
11. **Budgets are a gate** (`DESIGN.md` §7).
12. **Never lose a person's writing.** Drafts persist through errors, locks and storage failures, and destructive actions confirm.
13. **Fonts are self-hosted** (`@fontsource`), with no Google Fonts or other CDNs at runtime.

## Definition of done

- Typecheck and lint are clean (oxlint, zero warnings once adopted). Unit, e2e and axe tests are green.
- **Checked in a real browser**: the changed screens at 390 / 768 / 1440px, light and dark, with reduced motion, and in 2D and 3D where relevant.
- Budgets are green, and the design checklist in `DESIGN.md` §11 passes for UI changes.
- Docs are updated when behaviour, data or security changes (MODULES, FLOWS, PRIVACY, ARCHITECTURE).

## Conventions

- **Language:** code and docs in English; UI copy in English via message catalogues (i18n-ready). The owner discusses in Indonesian.
- **Commits:** imperative subject ≤ 72 chars, scoped where useful (`envoi: seal ceremony 2D`, `vault: opaque rids`). One logical change per commit. Commit or push only when asked.
- **Branches and PRs:** branch off `main`. The PR description states which docs and ADRs it implements and how it was verified.
- **ADRs:** significant decisions get a new `docs/adr/NNNN-*.md` (Context · Decision · Consequences · Alternatives).
