# ADR 0010 — AI policy: none in v1, on-device only if ever

Status: Proposed · Date: 2026-11-22

## Context
AI features such as yearly summaries, prompts and pattern finding are tempting. But sending journal content to a cloud model breaks the privacy promise.

## Decision
- **No AI features in v1.**
- Any future AI feature must run **entirely on-device** (e.g. WebGPU or WASM models), never transmit content, be opt-in per feature, and be documented in `PRIVACY.md` before release.
- Cloud AI is not permitted for user content.

## Consequences
- ETERNALL can honestly say "your words never leave your device to be read by a machine either."
- Future AI is limited by on-device capability and model download size.

## Alternatives considered
- **Cloud AI with opt-in:** rejected because it weakens the zero-knowledge claim.
- **"AI-free" as a permanent brand stance:** kept open. On-device AI may serve people without compromising privacy.
