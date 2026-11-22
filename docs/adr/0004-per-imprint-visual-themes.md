# ADR 0004 — Each imprint has its own visual theme, layout and motion

Status: Proposed · Date: 2026-11-22

## Context
The owner wants every module to be unique, anti-mainstream and stunning, as AMAZEEN is, while staying easy to understand.

## Decision
- Each imprint owns its full visual system: palette, typography, spatial system, motion and signature moment (`design/<imprint>.md`). Themes are scoped to `[data-imprint]` and lazy-loaded.
- Shared across imprints: the spine, accessibility standards, motion physics, performance budgets, chart rules and the clarity guardrails (`DESIGN.md`).
- `packages/ui` provides behaviour only, with no visual style.

## Consequences
- More design work per imprint, and more CSS and fonts. These are bounded by per-imprint budgets and lazy loading.
- A consistent spine and plain-word actions keep the experience learnable across very different looks.
- Design reviews use the checklist in `DESIGN.md` §11.

## Alternatives considered
- **One design system with accent "skins":** rejected as too uniform for the stated ambition.
