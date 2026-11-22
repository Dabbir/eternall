# ADR 0005 — three.js for immersive 3D moments

Status: Proposed · Date: 2026-11-22

## Context
Several signature moments benefit from real 3D: the life coil, the envelope, the bookshelf, the orrery, the stage and the constellation. Writing raw WebGL for each would be slow and error-prone.

## Decision
- Use **three.js**, loaded only inside lazy 3D chunks via `packages/stage`.
- Geometry is procedural. Rendering is on demand. The capability gate and frame-time auto-downgrade apply to every scene.
- `@react-three/fiber` is optional, per imprint, and only if it simplifies a scene without breaking budgets (a separate ADR is needed if adopted).
- CSS 3D is preferred where it suffices (AMAZEEN covers, MARGINALIA cabinet).

## Consequences
- About 150 KB gzip for three.js, paid only when a person enters a 3D mode.
- Every 3D mode must keep a complete 2D equivalent (`DESIGN.md` §6).

## Alternatives considered
- **Raw WebGL:** too costly to build. **Babylon.js:** heavier. **No 3D:** doesn't meet the owner's ambition.
