# ADR 0007 — One core, many doors: one origin with a path per imprint

Status: Proposed · Date: 2026-11-22

## Context
People must be able to use a single imprint directly, without passing through the platform. Yet all imprints share one encrypted vault, which lives in browser storage scoped per origin.

## Decision
- All doors live on **one origin**, under a path per imprint (`/amazeen/`, `/envoi/`, …).
- Each door has its own HTML entry, a PWA manifest with its own `id` and `scope`, its own onboarding, and **focus mode**.
- Marketing domains redirect to the paths. **Subdomains are not used for the app.**
- The house dashboard is optional and offered only once two imprints are in use.

## Consequences
- One vault and one service worker. Data is shared instantly between doors, and local-first stays true.
- Each imprint can be installed as its own app icon.
- Deep links of the old AMAZEEN need a redirect map.

## Alternatives considered
- **Subdomains per imprint:** separate storage per origin breaks the shared vault.
- **Fully separate apps:** heavy, and the data couldn't be merged.
- **A single entry with no doors:** imprints would lose their own identity.
