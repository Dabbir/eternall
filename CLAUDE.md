# CLAUDE.md — ETERNALL

> `CLAUDE.md` and `AGENTS.md` are kept identical. Change both together.

ETERNALL is **a private personal toolkit**: one local-first, end-to-end-encrypted platform of apps that share a vault, not data. **Three apps and Home** (`docs/PRODUCT.md`, ADR 0013, ADR 0014):
- **Journal · AMAZEEN**: a journal pressed into a weekly issue, with **People** (the people you write about, once KINDRED) and **Letters** to your future. The first product and the way in.
- **Money · CASHEEN** (formerly LEDGER): money in and out and a monthly budget, written in one line (ADR 0012).
- **Practices · ROUTEEN** (formerly REFRAIN): the loom — each practice a thread, each day a row.

The **house** (ETERNALL) is **Home** (one card per app, no money figures) and the optional **Your life in weeks** (the lifeline, with chapters and inscriptions). MARGINALIA was retired; its underlines became journal quotes. Read `docs/PRODUCT.md`, then ADR 0014, ADR 0013 and ADR 0011.

## Current state (read this before changing anything)

- The owner approved the docs and asked to build through every phase. Work happens on branch `platform`, one commit per verified phase, never pushed (`docs/ROADMAP.md` tracks progress).
- **Phase 9 is in progress (ADR 0014):** three apps and Home; steps in `docs/ROADMAP.md`. Data paths never move: `kindred/*`, `refrain/*` and `marginalia/*` stay.
- **Phase 8 is done (ADR 0013):** AMAZEEN first. The steps (`docs/ROADMAP.md`): LEDGER was renamed CASHEEN (done: `modules/casheen`, door `/casheen/`, `/ledger/*` redirects, collection paths stay `ledger/*`, old settings ids read through `withCurrentIds`); Journal and Money on by default, other apps opt-in in Settings → Apps, new people land in the app not the lifeline, CASHEEN contributes nothing to the house (done: `house/domain/apps.ts` `appsOn`/`withApp`, `house/AppOff.tsx`); one app bar with the same positions in every app (done: kit `AppBar`, `packages/kit/src/appbar.tsx`, structure in `packages/ui/src/ui.css`; AMAZEEN mirrors it in `AppShell`); personal looks for AMAZEEN (done: `modules/amazeen/src/imprint/look/`, vault record `amazeen/prefs`; the house owns light/dark via `<html data-host-theme>`). Phase 8's code is complete; the owner's next steps are in `docs/PRODUCT.md`.
- **Phase 7 is done (ADR 0012):** LEDGER, now CASHEEN (`modules/casheen`). The quick-line parser is `quick.ts`; amounts never leave CASHEEN.
- **Phase 6 is done (ADR 0011):** consolidated from 8 imprints to 4 apps.
  - ENVOI became AMAZEEN's Letters (`modules/amazeen/src/imprint/letters/`).
  - FOLIO and ALMANACK became house sections (`apps/web/src/house/{chapters,almanac}/`).
  - PROLOGUE was retired, with its seasons migrated to inscriptions.
  - Collection paths never changed, and old doors redirect.
  - Each app renders its own chrome (`modules/<id>/src/app/Chrome.tsx` on the kit `AppBar`, AMAZEEN's `AppShell`) and its own kit stylesheet (`theme/<id>.kit.css`). The house spine appears on house pages only.
- **Phase 1 is done:** the monorepo (`apps/web`, `packages/{core,vault,kit,ui,stage}`, `modules/*`, `services/sync-worker`) replaces the original single app.
- **Phase 5 is done:** REFRAIN, KINDRED and MARGINALIA live in `modules/` (PROLOGUE was later retired), with their capabilities wired and tested with and without their providers. Local reminders go through `ImprintDefinition.reminders` and the shell (`apps/web/src/shell/reminders.ts`).
- **Release 1 is built:** sync, anonymous licences, Patron and the PWA (`services/sync-worker`, `packages/vault/src/{protocol,sync}.ts`). Owner TODOs (payment provider, prices, trademark checks, independent privacy review, D1 database) are listed in `docs/ROADMAP.md`.
- **Phase 4 is done:** 3D lives in lazily-loaded scene modules (`*Scene.ts`) mounted through `@eternall/stage`'s `Stage3D`; every one has its 2D view and a `DimensionToggle`. three.js is the only 3D dependency.
- **Phase 3 is done:** AMAZEEN lives in `modules/amazeen` (imported with its history). Its code keeps its own conventions; ETERNALL-specific glue is in `modules/amazeen/src/imprint/`. Patches for the original repo go in `docs/patches/`, never applied by us.
- **Phase 2 is done:** everything is encrypted at rest in IndexedDB through `packages/vault` (keyring, encrypted store, recovery kit). Never write personal data anywhere else.
- **AMAZEEN lives in `~/orca/amazeen-app`. Never modify it in place.** It is imported via `git subtree` in Phase 3 (`docs/adr/0006`). Changes to it need the owner's explicit approval.

## Commands

```bash
npm run dev        # Vite dev server for apps/web on :5181 (doors: /, /amazeen/, /refrain/, /kindred/, /marginalia/, /casheen/; house pages /chapters, /almanac, /inscriptions)
npm test           # Vitest across all workspaces
npm run typecheck  # one root tsc over every workspace
npm run lint       # oxlint, zero warnings
npm run build      # typecheck + production build + bundle budgets (scripts/check-budgets.mjs)
npm run dev:api    # sync + licence API on :8788 (services/sync-worker); writes dev keys first
```

## Docs map

| Need | Read |
|---|---|
| What ships first, for whom, and why | `docs/PRODUCT.md` (and ADR 0014) |
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
   - Each app is its own site (ADR 0011): never put the house spine, mark, name or house-looking primitives inside an app. Controls sit in the **same positions in every app** (ADR 0013): back, name, places, search, lock and the primary action. Restyle shared primitives through tokens in the app's `theme/<id>.kit.css`, and use small caps (`font-variant-caps`), never `text-transform: uppercase`.
   - Follow the app's `design/*.md` spatial system, palette and motion.
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
