# AMAZEEN

**The weekly magazine of your own life.**

Write a little every day (a story, a quick note, something someone said, a list) and every Sunday at midnight AMAZEEN takes the week to press as a real, laid-out magazine issue: a riso-printed cover, contents page, feature spreads with drop caps and pull quotes, a "Dispatches" section, an "Overheard" page, a *By the numbers* data spread with a mood "weather report", and a back page. Issues collect on a searchable, printable shelf.

No account, no server. Everything lives in your browser and can be exported/imported as JSON.

## Data model (local-first)

- **IndexedDB** holds the archive. Every save is also mirrored synchronously to `localStorage` with a timestamp, so a write cut off by closing the page is never lost. On load, the newer copy wins.
- **Drafts** live in `localStorage` and are flushed when the tab is hidden.
- **Several tabs** stay in sync through `BroadcastChannel`.
- The app asks the browser for **persistent storage**, and installing it as a PWA makes eviction far less likely.
- **Backups:** Settings → Export downloads a JSON archive. The Desk reminds you when there are un-exported changes older than 14 days. Import previews the file, then merges (newest edit wins) or replaces.
- **Schema changes** go through `migrate()` in `src/domain/storage.ts`, so old exports always open.
- **Sync (optional):** Office → Sync keeps one journal across devices, **end-to-end encrypted**: the server only stores data it can't read, and you connect devices with a sync key (no email or password). Details and limits are in [`docs/sync-security.md`](docs/sync-security.md).

## Deploying (Cloudflare Workers)

AMAZEEN deploys as **one Cloudflare Worker**: the built app is served as static assets, and a small Worker answers `/api/*` (the sync service, backed by a D1 database). Everything is configured in [`wrangler.jsonc`](wrangler.jsonc), which is the source of truth for the deployment, including the D1 binding.

### First deploy (app only)

1. Cloudflare dashboard → Workers & Pages → Create → connect this GitHub repo.
2. Build command `npm run build`; deploy command `npx wrangler deploy` (the default).
3. The Worker's name in the dashboard must match `name` in `wrangler.jsonc` (`amazeen-app`), or Workers Builds refuses to deploy.
4. Pushes to `main` deploy to production; other branches get a preview. `public/_headers` sets the CSP, HSTS and caching. Deep links like `/issue/2026-W46?p=3` work because unknown paths get the app (`not_found_handling`).

### Turning on sync (one-time)

Without this the app works fully; the Sync section just reports it can't reach the service.

1. **Create the database:** dashboard → Storage & databases → D1 → Create database, named `amazeen-sync`. (Or `npx wrangler login && npx wrangler d1 create amazeen-sync`.)
2. **Create the tables:** open the database → Console, paste the contents of [`migrations/0001_init.sql`](migrations/0001_init.sql), and run it. Future schema changes ship as new files in `migrations/` and are applied the same way.
3. **Tell the app which database:** copy the database's **ID** from its page and set it as `database_id` in [`wrangler.jsonc`](wrangler.jsonc) (already done for this project's `amazeen-sync`). The ID is an identifier, not a secret, so it's fine to commit. Merge to `main` and Cloudflare redeploys with the binding. To use a different database, change the ID.
4. **Rate-limit the API** (important, since accounts are anonymous): Security → WAF → Rate limiting rules. For example *URI Path starts with `/api/`* → 120 requests per minute per IP, and a stricter rule for *Method equals POST and URI Path equals `/api/account`* → 5 per 10 minutes.
5. **Check:** `https://<your-site>/api/health` should return `{"ok":true}`, then try Office → Sync on two devices.

> The binding can't be added in the dashboard for a Worker deployed from this repo, because the config file is the source of truth. That's why step 3 edits `wrangler.jsonc` instead.

### Previews (pull requests)

Cloudflare builds every non-production branch with `wrangler preview`, which refuses to use the production database. The `previews` block in `wrangler.jsonc` points previews at a separate `amazeen-sync-preview` database (create it the same way as the production one, run `migrations/0001_init.sql` in its Console, and put its ID in the block). Trying sync in a preview therefore never touches real journals.

### Local development

`npm run dev:api` builds the app and runs it together with the API on `http://localhost:8788`, using the same `wrangler.jsonc` and a local D1 (created from `migrations/`, kept in `.wrangler/`). The end-to-end tests run this way too, so they exercise the real routing, headers and database.

### Release checklist

1. CI green on the pull request (lint, types, unit, build, e2e + accessibility).
2. Open the preview URL and spot-check the Desk, Composer, Reader and Shelf on a phone.
3. Bump `version` in `package.json`, add a `CHANGELOG.md` entry, and merge to `main`.
4. Verify production. Open tabs get an "A new edition of AMAZEEN is ready" prompt.
5. To roll back, open the Worker → Deployments and roll back to the previous version.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint (zero warnings allowed)
npm test           # unit + integration tests (Vitest + Testing Library)
npm run test:e2e   # Playwright against the production build, with axe accessibility audits
npm run build      # typecheck + production build (PWA) to dist/
npm run dev:api    # build, then run the app AND the sync API locally on :8788 (Cloudflare's runtime + a local D1)
```

## The product

| Screen | What it does |
| --- | --- |
| **Onboarding** | Name your magazine and watch the masthead appear live on a sample cover. Start blank or with a six-week sample archive. |
| **Desk** | This week's issue in production: live cover proof, a *press check* (cover story, 5 pieces, a quote, 3 days on the beat), deadline countdown, filed pieces grouped by day with star / edit / delete-with-undo, streak and archive stats. |
| **Composer** | Distraction-free writing for four kinds of piece. Section, mood ("weather") and cover-worthy toggle. Per-kind autosaved drafts that survive reloads, inline validation that focuses the first problem, unsaved-edit guards, `⌘↵` to file, and a rubber-stamp *FILED* moment. |
| **Reader** | The issue, page by page. Arrow keys, swipe, page rail, deep-linkable `?p=` pages, page-turn motion, "art-direct the cover" (ink + cover line), and a print stylesheet that prints every page. |
| **Shelf** | Every issue by month as covers; full-text search across all issues with highlighted matches that deep-link to the exact page; section filters. |
| **Settings** | Masthead, export/import (validated, size-capped, damaged entries skipped), sample data, type-to-confirm erase, and rescue export if stored data is ever unreadable. |

Keyboard: `W` story · `N` note · `/` search · `←/→` turn pages · `Esc` close.

## Architecture

```
src/
  domain/      Pure, framework-free business logic (fully unit-tested)
    types.ts     Discriminated-union Entry model, Issue, AppData
    entries.ts   Normalisation, validation, strict parsing of untrusted data
    issues.ts    ISO-week grouping, numbering, cover-story selection, cover lines, stats, press check, streaks
    layout.ts    Turns an issue into pages + table of contents
    search.ts    Multi-term search with snippets
    storage.ts   Versioned persistence; never throws, reports corrupt/quota/unavailable
    dates.ts     ISO weeks, ranges, countdowns
    text.ts      Word counts, pull-quote picking, smart quotes, safe highlighting
  state/       Reducer + context store (derived issues memoised per week), hooks
  router/      ~150-line typed History router with View Transitions
  components/  CoverArt (CSS-only, container-query scaled), Dialog (native <dialog>), Toasts, shell
  features/    onboarding · desk · composer · reader · shelf · settings (secondary screens code-split)
```

Design decisions:

- **Only React at runtime.** Routing, state, dialogs, toasts and charts are small, purpose-built modules. Fonts are self-hosted.
- **Covers are pure CSS.** All measurements use `cqi` container units, so one component renders crisply from a 110px thumbnail to a full page, and prints.
- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Untrusted input is parsed, not trusted.** Imports and storage go through the same validators as the composer; React escapes all text, and search highlighting never builds HTML.
- **Accessible by default:** semantic landmarks, skip link, labelled controls, native radios for pickers, live regions for page turns and toasts, visible focus, `prefers-reduced-motion` and `prefers-color-scheme` support.

Typography: Fraunces (display), Newsreader (text), Instrument Sans (labels), self-hosted via Fontsource.

## Brand

The logo lives in `assets/logo/`:

| File | Use |
| --- | --- |
| `amazeen-logo.svg` | Primary lockup with tagline |
| `amazeen-logo-reversed.svg` | Same, for dark backgrounds |
| `amazeen-wordmark.svg` | Lockup without the tagline |
| `amazeen-mark.svg` | Monogram on its own |
| `amazeen-icon*.svg` | App icon tiles |
| `amazeen-logo-sheet.svg` | Overview sheet |

- **Monogram:** an editorial A with a swash foot and a four-point star as its counter. The star is cut out, so the mark works on any background.
- **Wordmark:** Fraunces Black. The tagline is Newsreader Italic. Both are outlined to paths, so the files need no fonts.
- **Colours:** vermilion `#d43a24` (`#ff5a42` on dark), charcoal `#1b1814`, ivory `#f2ede3`.
- **Rebuilding:** run `python3 scripts/logo/build_logo.py` (needs `fonttools`). It rebuilds every logo file, the favicon and the PWA icons. In the app, the monogram is the `Monogram` component in `src/components/Logo.tsx`.

See [`docs/audit.md`](docs/audit.md) for the production-readiness audit and [`CHANGELOG.md`](CHANGELOG.md) for releases.
