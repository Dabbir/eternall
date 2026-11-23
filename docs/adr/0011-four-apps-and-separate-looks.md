# ADR 0011 — Four apps, each its own site; the house keeps the rest

Status: Accepted · Date: 2026-11-23 · Supersedes: the shared-spine parts of ADR 0004 · Keeps: ADR 0002, ADR 0007

## Context
After building all eight imprints, the owner asked for two changes:
1. **Fewer modules.** Keep only the ones that are truly useful, like journaling.
2. **Each module should feel like its own app**, with no resemblance to the ETERNALL parent. Opening one should feel like opening a new site. The house keeps its current look.

Before this, every imprint sat under the house spine: an ink-black bar with the house mark, search, the primary action and the lock. Every imprint also used the same pill buttons, dialog chrome and toasts. Only colours and fonts differed.

## Decision

**Four apps, each with its own door:** AMAZEEN (journal), REFRAIN (habits), KINDRED (people) and MARGINALIA (reading).

**The other four are merged where they fit, and nothing is lost:**
- **ENVOI** becomes AMAZEEN's **Letters** room (`/amazeen/letters`), set in AMAZEEN's inks.
- **FOLIO** becomes the house's **Chapters** page (`/chapters`).
- **ALMANACK** becomes the house's **Almanac** page (`/almanac`).
  - Both are *house sections*: they keep records and contribute like apps, but have no door of their own (`HouseSection` in `packages/core`).
- **PROLOGUE** is retired. Each season becomes a house inscription once (`apps/web/src/house/domain/migrations.ts`). The original records stay.
- **Records keep their paths** (`envoi/*`, `folio/chapter`, `almanack/settings`, `prologue/*`), so no data moves. Old URLs redirect (`retiredDoorRedirect`).

**Each app is its own site:**
- **Chrome.** The shell renders an app bare, with no house spine, doors menu or house name. Each app draws its own chrome (`modules/<id>/src/app/Chrome.tsx`, or AMAZEEN's own `AppShell`): masthead, its own navigation, primary action, search, lock, and a small exit to the house in its own idiom.
- **Behaviour comes from the kit.** `House.leave()`, `lock()`, `canLock`, `openSearch()`, `notices`, `primaryAction` and `introNote`.
- **Theme scope.** `<body data-imprint>` carries the app's tokens to the page, dialogs and toasts.
- **Shared primitives.** Buttons, fields, dialogs, toasts, Segmented and the Flat/3D toggle read their shape from tokens, with the house's values as fallbacks. Each app restyles them in `theme/<id>.kit.css`.
- **Identity outside the page** is declared in `ImprintDefinition.brand`: tab icon, manifest, theme colour, the heading of its own unlock card, and its exit label.
- **Search and copy.** ⌘K inside an app searches that app only. Shared copy (lock setup, update prompt, splash) is neutral or door-aware.
- **Navigation.** Crossing between the house and an app is a clean cut, with no shared transition.

**Still one document and one vault (ADR 0002, ADR 0007).**
- Switching apps is an in-page swap that changes everything visible, not a page load. A page load per door would lock the vault on every switch.
- Avoiding that lock would mean persisting the key, which would weaken `PRIVACY.md`.

## Consequences
- **The house spine** appears on house pages only. "Predictable locations" now holds *within each app*: its exit, action, search and lock stay in one place on every screen of that app.
- **More design work per app**, bounded by four apps instead of eight.
- **The recovery kit** stays named "ETERNALL recovery kit". It opens the whole vault, and its name must be unambiguous when it's needed.
- **Legal and privacy text** still names ETERNALL, the house that keeps the data.
- **ENVOI, FOLIO, ALMANACK and PROLOGUE** become reserved names (`BRAND.md`). Their design docs move to `docs/design/archive/`.

## Alternatives considered
- **Real page loads per door:** rejected, because of the vault lock above.
- **Subdomains per app:** rejected for the same reason as in ADR 0007 (separate storage).
- **Keep the spine and only restyle it per app:** rejected, because it still says "ETERNALL" everywhere, against the owner's direction.
- **Delete the merged modules outright:** rejected. People's letters, chapters and seasons are kept and keep working.
