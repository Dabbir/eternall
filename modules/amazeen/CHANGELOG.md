# Changelog

All notable changes to AMAZEEN. Versions follow [semver](https://semver.org).

## 1.4.0 (2026-11-18)

**Sync across devices, end-to-end encrypted.**

- **Office → Sync:** turn it on, get a sync key (shown once, with a typed confirmation), connect another device by entering the key, sync now, show the key again, disconnect a device, or delete the cloud copy.
- **Private by construction:** entries are encrypted on the device (AES-256-GCM, a key derived from the sync key) before they leave it. The server stores only data it can't read, plus minimal metadata. Details and limits are in `docs/sync-security.md`.
- **No email or password:** the key is the only secret. Losing it means the cloud copy can't be recovered, which the app says clearly.
- **Correct merging:** the newest change wins per entry; deletions travel as tombstones so an offline device can't bring a deleted piece back; Undo restores everywhere. Replacing the archive (import, sample) records what it drops.
- **Stays local-first:** writing never waits for the network. Sync runs after changes, when the tab returns, when the network comes back, and each minute; the status light shows synced / syncing / offline / needs attention.
- **Backend:** a Cloudflare Worker with a D1 database (`migrations/0001_init.sql`), same origin as the app: the built app is served as static assets and only `/api/*` runs the Worker. Configured in `wrangler.jsonc`; setup steps are in the README.
- **Schema v2:** archives gain `tombstones`; v1 files and saved data migrate automatically.
- **Security headers verified for real:** the whole e2e suite now runs on Cloudflare's local runtime with the real `_headers`, which caught and fixed three problems: a CSP directive that broke WebKit on localhost, fonts inlined as `data:` URIs that the CSP blocked, and a removed Permissions-Policy feature.
- **Privacy page** updated to describe sync honestly.

## 1.3.0 (2026-11-18)

**The edition lamp, and a responsive and readability pass.**

- **Pull-cord lamp:** the day/night switch is now a pendant lamp with a pull cord.
  - Pull the cord down to put the lights out (night); pull again for day.
  - The cord stretches with resistance, springs back and swings. A tap, Space, Enter or ArrowDown also pulls it, and phones get a light haptic tick.
  - It hangs inside the spine on wide screens; on phones and in the reader the cord dangles below the top bar.
  - It is still a real `role="switch"`.
- **Responsive audit:** every screen at 320, 375, 768, 1024 and 1440 px. Fixed:
  - Horizontal overflow on the Desk, the Shelf, the Composer (hidden radios escaping the chip scroller), the list editor and onboarding.
  - Shelf strips that lost their titles on phones.
  - A crowded reader chrome.
  - A 20 px date picker.
- **Readable type:**
  - Small labels raised to at least about 11 px (spine, tabs, flatplan, galley, Shelf spines).
  - The reader's full-size cover never drops below readable sizes on phones. Decorative thumbnails keep their proportions.
- **Phones:** the flatplan becomes a swipeable strip of spreads at a readable page size.
- **Regression guard:** `e2e/responsive.spec.ts` checks overflow, minimum text size and 24 px targets on all main screens at five widths, plus the lamp's pull and tug behaviour.

## 1.2.0 (2026-11-18)

**Day and Night editions.**

- **Edition switch:** an interactive switch, vertical on the spine and horizontal in the phone top bar and the reader. Day shows a sun knob on paper; Night shows a crescent moon with stars on ink.
- **Ink-spill transition:** switching spreads the new edition outward from the switch as a growing circle (View Transitions API). It falls back to an instant switch, and stays instant with reduced motion.
- **Choices:** System (the default, follows the OS live), Day or Night. Pick in the Office's new *Edition* section, or press `T` anywhere. The choice is remembered per device and synced across tabs.
- **No flash of the wrong theme:** a tiny blocking `theme-init.js` applies the saved edition before first paint. It's a separate file because the strict CSP forbids inline scripts.
- **Accessibility:** both editions pass WCAG 2.1 AA, with axe now run in Night as well. The switch is a real `role="switch"`.

## 1.1.0 (2026-11-18)

A new design direction: **The Production Room**. The app now borrows the artefacts of making a magazine.

- **Spine navigation:** an ink-black magazine spine down the left edge carries the sections (set vertically), the masthead and the press deadline. Phones get index tabs.
- **The Desk is a flatplan:** the week's issue as page thumbnails bound in spreads. Empty sections are dashed slots that open the composer, and production notes appear in proof blue.
- **Jot line:** file a note from the desk with Enter.
- **Galley:** this week's pieces as proof slips with day marginalia, plus a circulation band.
- **The Shelf is a stack of spines,** thick as each week was full, with tilted spines that pull out into covers. On phones they lie flat. Search reads as a printed index with dot leaders and page references.
- **Composer as manuscript:** an outlined kind label in the margin and a production docket on the right.
- **Reader:** features open as two-page spreads on wide screens; a page jumper (`G`).
- **The Office:** settings set as a masthead page with a staff box.
- **Issue Zero:** onboarding on a dark stage.
- **Motion:** scroll-driven reveals and a drifting issue numeral (CSS scroll timelines, with fallbacks), and new page transitions.
- **Type:** JetBrains Mono joins Fraunces and Newsreader as the production voice.

## 1.0.0 (2026-11-18)

First production release.

- **Magazine:** weekly issues compiled from your stories, notes, quotes and lists, with riso covers, contents, features, Dispatches, Overheard, By the numbers and a back page. Printable.
- **Writing:** composer for four kinds of piece, per-kind autosaved drafts, backdating within the current week, cover-worthy stars, press check.
- **Archive:** searchable shelf with deep links to the exact page; cover art direction.
- **Data:** IndexedDB with a synchronous mirror, cross-tab sync, persistent storage, export reminders, import preview with merge or replace, schema migrations.
- **App:** installable PWA that works offline, with prompted updates and self-hosted fonts.
- **Quality:** strict CSP and security headers, WCAG 2.1 AA (axe-checked), CI with lint, types, unit and e2e tests. See `docs/audit.md`.
