# AMAZEEN implementation audit

Date: 2026-11-18 · Scope: logic, data/persistence, UI, accessibility, security, performance · Build: v1.0.0

## Method

- **Code review** of each layer (`src/domain`, `src/state`, `src/router`, `src/features`, CSS), focused on edge cases: empty and large archives, week rollover, time zones/DST, multiple tabs, extreme input, the page closing mid-action.
- **Static analysis:** oxlint with React hooks, React Compiler-style purity/ref rules, jsx-a11y, vitest and unicorn plugins (`npm run lint`, zero warnings allowed).
- **Automated tests:**
  - 58 unit/integration tests (Vitest + Testing Library), including an ISO-week property test over every day from 2000–2100, junk-input parsing, and IndexedDB via `fake-indexeddb`
  - 35 Playwright end-to-end runs (desktop Chrome, Pixel 7, iPhone 14) against the production build
  - axe WCAG 2.1 AA scans of every screen and the reader pages
- **Exploratory checks:**
  - every screen at 390 / 768 / 1280–1440 px, light and dark, reduced motion
  - print/PDF of a full issue (7 pages → 7 PDF pages)
  - computed WCAG contrast ratios for every text/background token pair

## Findings

Severity: **H** high (data loss or broken core flow), **M** medium, **L** low. Every fix has a regression test unless noted.

| # | Area | Finding | Sev | Status | Test |
|---|------|---------|-----|--------|------|
| 1 | Data | Persistence skipped only the "first" save via a ref; under React StrictMode the effect ran twice and could overwrite **unreadable stored data** with an empty archive before the user could rescue it. | H | Fixed: only user actions mark the store dirty | `app.test.tsx` › #1 |
| 2 | Data | **Saves cut off by closing the page.** IndexedDB writes are async; reloading or closing within milliseconds of an action (just after onboarding, filing, importing) lost the change. Found by e2e. | H | Fixed: synchronous timestamped localStorage mirror; load picks the newer copy | `storage.test.ts`, e2e journeys |
| 3 | Data | **Erase everything** left unfinished drafts and the legacy localStorage copy behind; the dialog also closed before storage was wiped, so a quick reload brought the archive back. | H | Fixed: `eraseAll()` clears archive, mirror and drafts; dialog waits | `app.test.tsx` › #2, e2e export/erase/import |
| 4 | Data | Two open tabs overwrote each other (last write wins, no sync). A first fix caused an infinite save ping-pong between tabs. | M | Fixed: BroadcastChannel reload, per-change dirty flag | `app.test.tsx` › #4 |
| 5 | Data | Draft autosave is debounced 450 ms; hiding/closing the tab inside that window lost the last keystrokes. | M | Fixed: flush on `pagehide`/`visibilitychange` | `app.test.tsx` › #3 |
| 6 | Logic | Entries were always dated "now"; you couldn't log yesterday's moment in this week's issue. | M | Fixed: "Today / Yesterday / weekday" picker, limited to the current week | `domain.test.ts` › filing dates |
| 7 | Logic | `W`/`N` shortcuts ignored with Caps Lock on. | L | Fixed | `app.test.tsx` › #6 |
| 8 | UI | Search showed "50+" when there were exactly 50 results; only the first query word was highlighted. | L | Fixed | `storage.test.ts` › search |
| 9 | UI | Reader page went blank on phones (grid placement); Shelf URL sync could bounce you back from an issue. *(Found and fixed during the build.)* | H | Fixed | `app.test.tsx` › reader |
| 10 | UI | Print: "Overheard" and back pages lost their colour backgrounds. | M | Fixed | Manual PDF check |
| 11 | UI | Import button icon squeezed to 3 px in narrow rows; reduced-motion users still waited for animation delays. | L | Fixed | Visual check |
| 12 | A11y | Small red text (`#e8432e`, 3.4:1), grey meta text (`#7d7467`, 3.9:1), white-on-red buttons (3.8:1) and teal labels (4.0:1) were below WCAG AA 4.5:1. | M | Fixed: `--press-text`, darker `--ink-3`, `--press` `#d43a24` | axe in e2e |
| 13 | A11y | Icon-only buttons on mobile had no name; link labels differed from visible text; the scrollable reader page wasn't keyboard-focusable; toasts could be announced twice. | M | Fixed | axe in e2e |
| 14 | React | Refs read/written during render (store, hotkeys, reader), impure calls in render, `setState` inside effects (composer, cover editor), memo-cache mutation (shelf), suppressed hook dependencies. Latent stale-UI bugs. | M | Fixed | oxlint (CI) |
| 15 | Perf | The 30 s clock re-rendered every store consumer. | L | Fixed: clock in its own context; issues recompile only on week rollover | — |
| 16 | Security | No CSP or security headers; fonts loaded from a third party. | M | Fixed: strict CSP + HSTS etc. in `public/_headers`, self-hosted fonts, no inline scripts | Build output check |

## Decisions and known limitations

- **Language:** the interface and dates are English only (`Intl` locale fixed to `en`). Adding Indonesian is a product decision; the copy is centralised enough (`domain/catalog.ts` plus feature components) to translate later.
- **Data is per device and browser.** By design: local-first, no accounts. Mitigated by IndexedDB, the synchronous mirror, permanent-storage requests, installability, and backup reminders. Cloud sync can be added behind the existing `StorageAdapter` interface.
- **Weeks follow local time.** An entry written while travelling across time zones is filed by the device's clock at the time.
- **Export checksums** were considered and skipped: validation already rejects truncated or damaged files, so a checksum adds no real protection.
- **WebKit offline test** is skipped (Playwright WebKit doesn't emulate service-worker offline reliably). Offline behaviour is covered on Chromium and should be checked by hand on iOS after deploy.
