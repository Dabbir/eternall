# ADR 0006 — Bring AMAZEEN in with git subtree

Status: Proposed · Date: 2026-11-22

## Context
AMAZEEN (`~/orca/amazeen-app`, v1.4, 43 commits) must become `modules/amazeen`, and its history should not be lost. The original repo must not be modified in place.

## Decision
Use `git subtree add --prefix=modules/amazeen <amazeen-remote-or-path> main` to import AMAZEEN with its full history. Generic parts (crypto, keyphrase, idb, storage mirror, sync engine, Worker) are then lifted into `packages/vault` and `services/sync-worker` in follow-up commits. The original repo stays the source for AMAZEEN v1.5 (migration button) until the redirect.

## Consequences
- `git log -- modules/amazeen` shows AMAZEEN's history.
- Future upstream fixes to the old repo (before the migration) can be pulled with `git subtree pull`.

## Alternatives considered
- **Plain copy:** loses history. **Submodule:** keeps two repos, which works against the single platform.
