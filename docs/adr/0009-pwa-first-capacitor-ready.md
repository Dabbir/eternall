# ADR 0009 — PWA first, ready for Capacitor

Status: Proposed · Date: 2026-11-22

## Context
Both existing apps are web/PWA. Native apps would help distribution and notifications, but would cost a second codebase if planned badly.

## Decision
- Ship as a **PWA** in v1 (one service worker, a manifest per door).
- All platform access (storage, network, notifications, share, files) goes through shell adapters, so the same web code can later be wrapped with **Capacitor** for the App Store and Play Store without a rewrite.
- No React Native and no separate native UI.

## Consequences
- One codebase. Native builds later mean implementing the adapters plus in-app purchase.
- Some features differ by platform (WebAuthn PRF, local notifications, 3D performance), so the UI is capability-driven.

## Alternatives considered
- **Native from the start (Expo/React Native):** a second UI and 3D stack, which slows everything.
- **Web-only forever:** limits reach.
