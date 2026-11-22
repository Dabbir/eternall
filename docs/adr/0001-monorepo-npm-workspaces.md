# ADR 0001 — Monorepo with npm workspaces

Status: Proposed · Date: 2026-11-22

## Context
ETERNALL is becoming a platform made of a shell, shared packages (core, vault, ui, stage), nine imprints and a sync Worker. AMAZEEN must be brought in with its history, and every imprint must be able to load on its own. Both existing projects deliberately avoid heavy tooling.

## Decision
One repository at `~/orca/eternall`, using **npm workspaces** and **TypeScript project references**. There is no Nx, Turborepo or pnpm. The layout is `apps/web`, `packages/*`, `modules/*`, `services/sync-worker` and `e2e/` (`ARCHITECTURE.md` §4).

## Consequences
- One install, one lockfile, and atomic changes across packages.
- Build orchestration is plain `tsc -b` plus Vite. If CI gets slow, we can add caching later without restructuring.
- The workspace boundaries enforce the "imprints never import each other" rule (lint rule + package `exports`).

## Alternatives considered
- **Separate repos per imprint:** rejected because the vault and contract would drift and the origin would be split.
- **pnpm or Turborepo:** rejected for now. They add tooling without a current need.
