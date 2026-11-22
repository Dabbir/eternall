# ETERNALL — Architecture

Status: draft for review · Phase 0 · Related: `PRIVACY.md`, `MODULES.md`, `adr/`

---

## 1. Shape of the system

```
┌──────────────────────────────── one origin: eternall.app ────────────────────────────────┐
│                                                                                            │
│  /            /amazeen/      /envoi/      /folio/  …  /marginalia/      ← doors (HTML entries,│
│  ETERNALL     AMAZEEN        ENVOI        FOLIO       MARGINALIA          one PWA manifest each)│
│     │             │              │           │             │                                │
│     └─────────────┴──────┬───────┴───────────┴─────────────┘                                │
│                   apps/web  (shell: spine, doors menu, unlock, ⌘K, router)                  │
│                          │  lazy-loads one imprint chunk per door                           │
│        ┌─────────────────┼───────────────────────────────┐                                  │
│   packages/core     packages/vault                  packages/ui · packages/stage            │
│   (time, types,     (encrypted IndexedDB, lock,      (skinnable primitives · 3D/WebGL       │
│    validation)       keys, sync client, licence)      capability + render loop)            │
│                          │                                                                  │
│                          │  HTTPS, same origin, /api/*                                      │
└──────────────────────────┼─────────────────────────────────────────────────────────────────┘
                   services/sync-worker  (Cloudflare Worker + D1: ciphertext records, licences)
```

- **Local-first.** Every imprint works fully offline from the vault in IndexedDB. The network is only used for optional sync and licence checks.
- **One origin.** All doors share one origin so they share one vault (§2). Imprints are separate *products* in the UI and separate *chunks* in the bundle, but not separate apps.

## 2. Access model: one core, many doors

| Concern | Decision |
|---|---|
| URLs | `eternall.app/` (house) and `eternall.app/<imprint>/…` per imprint. Deep links like `/amazeen/issue/2026-W46?p=3` keep working. |
| Why not subdomains | `amazeen.eternall.app` is a different **origin**: different IndexedDB and different service worker, so the vault could not be shared without syncing through the server. One origin keeps local-first true. |
| Marketing domains | `amazeen.app`, `envoi.app` etc. **301-redirect** to `eternall.app/<imprint>/`. The old AMAZEEN origin redirects after its migration window (`FLOWS.md` F15). |
| HTML entries | Vite multi-page build emits `index.html` per door (`/`, `/amazeen/`, `/envoi/`, …). Each entry links **its own manifest**, theme colour, icons and OG image. All entries share the same JS chunks. |
| PWA install | One manifest per door: `{ id: "/amazeen/", scope: "/amazeen/", start_url: "/amazeen/", name: "AMAZEEN" }`. Each installs as its own app icon. The house manifest has `scope: "/"`. |
| Service worker | **One** SW at `/` (scope covers all doors), precaching the shell and lazily caching imprint chunks on first visit. Installed imprint apps share it. |
| Focus mode | Determined at boot: `display-mode: standalone` with an imprint scope, **or** only one imprint has ever been used. The spine collapses (`DESIGN.md` §2). |
| When the house dashboard is offered | After a second imprint gets its first record, a dismissible invitation appears once in the doors menu. The dashboard is always reachable from the house mark. |
| Standalone guarantee | An imprint must boot, onboard, read and write with **no other imprint's code loaded and no lifeline profile**. CI runs every imprint's e2e suite in isolation (§8). |

## 3. The imprint contract

Every imprint is a workspace package under `modules/<id>/` that default-exports an `Imprint` object. The shell knows imprints **only** through this contract.

```ts
// packages/core/src/imprint.ts (sketch)
export interface Imprint {
  id: ImprintId;                         // 'amazeen' | 'envoi' | 'folio' | …
  name: string;                          // 'ENVOI'
  functionLine: string;                  // 'Letters to your future'  (BRAND.md §4)
  basePath: `/${string}/`;               // '/envoi/'
  release: 1 | 2;

  /** Lazy UI. Loaded only when the door is opened. */
  load(): Promise<{ default: ImprintApp }>;

  /** Data. */
  schemaVersion: number;
  collections: readonly CollectionSpec[];          // e.g. [{ name: 'letters', schema: letterSchema }]
  migrate(from: number, records: AsyncIterable<VaultRecord>): AsyncIterable<VaultRecord>;

  /** Spine integration. */
  primaryAction(ctx: ImprintContext): { label: string; run(): void } | null;   // 'Write a letter'

  /** Contributions (pure, run against decrypted data in a worker). */
  weekSummary?(week: WeekRef, ctx: ReadContext): Promise<WeekContribution | null>;
  almanacFacts?(range: DateRange, ctx: ReadContext): Promise<AlmanacFact[]>;
  search?(query: string, ctx: ReadContext): Promise<SearchHit[]>;

  /** Optional cross-imprint capabilities (see §5). */
  provides?: Partial<CapabilityProviders>;
  consumes?: readonly CapabilityId[];
}

export interface WeekContribution {
  imprint: ImprintId;
  /** Minimal, non-content signals for the lifeline cell. */
  tone?: Tone; count?: number; marker?: 'letter-sealed' | 'letter-ready' | 'chapter-start' | 'ritual' | 'person' | 'work';
  /** One line for the week panel, e.g. "Issue 47 · 'Kiln opened — the blue glaze took'". */
  line: string;
  href: string;                           // deep link into the imprint at that week
}
```

**Rules:**
1. **Imprints never import each other.** Cross-imprint features go through capabilities (§5).
2. **Imprints never touch IndexedDB, `localStorage` or `fetch` directly.** They use `ctx.vault` and `ctx.net`, which the shell provides (this also makes Capacitor wrapping possible, §11).
3. **Domain logic is pure TypeScript** in `modules/<id>/src/domain/`, framework-free and unit-tested (the pattern of today's `src/domain/`).
4. **Contribution functions return signals, not content** where possible (tone, counts, a short line), so the lifeline stays fast and shows little.

## 4. Monorepo layout

npm workspaces only, with no Nx, Turborepo or pnpm (ADR 0001). TypeScript project references give incremental builds.

```
eternall/
├─ apps/web/                  Vite app: shell, router, spine, doors menu, unlock, ⌘K, house dashboard (lifeline)
│  ├─ index.html              house door
│  ├─ amazeen/index.html …    one HTML entry per imprint door (generated from the registry)
│  └─ src/
├─ packages/
│  ├─ core/                   week math, ISO dates, types, validation, Imprint contract, i18n helpers
│  ├─ vault/                  encrypted store, keys, lock, sync client, licence verification
│  ├─ ui/                     behavioural primitives (Dialog, Field, Toast, Segmented, Menu, Sheet), unstyled
│  └─ stage/                  capability detection, on-demand render loop, three.js loader, 2D fallback switch
├─ modules/
│  ├─ amazeen/  envoi/  folio/  almanack/  refrain/  prologue/  kindred/  marginalia/
│  │  ├─ src/domain/          pure logic + tests
│  │  ├─ src/app/             React UI (lazy)
│  │  ├─ src/scene/           optional 3D scene (separate lazy chunk)
│  │  ├─ theme/theme.css      scoped to [data-imprint="<id>"]; fonts via @fontsource
│  │  ├─ messages/en.ts       copy catalogue
│  │  └─ brand/               wordmark, icons, OG image, manifest fragment
├─ services/sync-worker/      Cloudflare Worker (/api/*) + D1 migrations
├─ docs/
└─ e2e/                       Playwright suites per door + cross-imprint journeys
```

**Toolchain**, aligned to AMAZEEN (the newer stack): React 19, Vite 8, TypeScript 7, Vitest, Playwright + `@axe-core/playwright`, oxlint (zero warnings), and `vite-plugin-pwa` (workbox). The current ETERNALL app moves from React 18 to 19 in Phase 1.

**Dependency policy:** runtime dependencies are limited to React, `@fontsource/*`, `three` (lazy, 3D chunks only) and `vite-plugin-pwa` (build). Any new runtime dependency needs an ADR.

## 5. Cross-imprint capabilities (optional links)

Imprints can enrich each other without depending on each other:

| Capability | Provider | Consumers | Example |
|---|---|---|---|
| `people.mention` | KINDRED | AMAZEEN, ENVOI, PROLOGUE | "@Ana" picker in a journal piece links to Ana's card |
| `quotes.offer` | MARGINALIA | AMAZEEN | Underlines offered as candidates for the "Overheard" page |
| `chapters.at` | FOLIO | house, AMAZEEN, ALMANACK | "This issue is part of *Lisbon*" |
| `rituals.week` | REFRAIN | house, PROLOGUE | A hope linked to a ritual line |
| `letters.compose` | ENVOI | AMAZEEN, PROLOGUE | "Seal this as a letter to next year" |

The shell keeps a **capability registry**. A consumer asks `ctx.capabilities.get('people.mention')` and receives `null` if KINDRED isn't enabled, and must render its feature without it. Links are stored as **stable references** (`{ imprint: 'kindred', id }`), so a link survives if the provider is disabled and is shown as plain text.

## 6. Rendering, routing and 3D

- **Router:** path-based (AMAZEEN's `src/router/router.tsx` approach, generalised). The shell owns the first path segment, and the imprint owns the rest. Navigation between imprints uses the View Transitions API (`DESIGN.md` §3).
- **Code splitting:** `imprint.load()` is a dynamic import. Theme CSS and fonts are imported by the imprint chunk, so they load with it. 3D scenes are a **second** dynamic import inside the imprint.
- **`packages/stage`:**
  - `canUse3D()` checks WebGL2, `deviceMemory`, `prefers-reduced-motion`, the battery saver hint and the user's "Flat pages" setting.
  - `createStage()` wraps the three.js renderer with **render-on-demand** (invalidate → one frame), pauses on `visibilitychange`, and does frame-time monitoring with automatic downgrade to 2D (`DESIGN.md` §7).
  - `<Scene2DFallback>` is a contract that requires the 2D view to exist and to be selected whenever 3D is unavailable.
- **Heavy computation** (decrypting and indexing for search, contributions across years) runs in a **Web Worker** so the main thread stays responsive (INP budget).

## 7. Data flow

```
 imprint UI ──writes──▶ ctx.vault.collection('envoi/letters').put(letter)
                          │  validate (imprint schema) → encrypt (AES-GCM, AAD) → IndexedDB
                          │  emit change event (BroadcastChannel to other tabs)
                          ▼
 house dashboard ◀── contributions recomputed for affected weeks (worker) ◀── change event
                          │
 sync client ──(if licensed & enabled)──▶ push ciphertext records / pull since cursor
```

- **Record envelope** (generalising AMAZEEN's wire format): `{ rid, updatedAt, deleted, blob }`, where `rid` is an **opaque HMAC of the logical id** (`PRIVACY.md` §5) and `blob` is the AES-GCM ciphertext of `{ imprint, collection, id, schemaVersion, value }`.
- **Merging:** newest-wins per record with tombstones. This is AMAZEEN's `mergeData` semantics, lifted into `packages/vault` for all imprints.
- **Durability:** IndexedDB plus a synchronous `localStorage` mirror of *pending ciphertext* for writes cut off by page close (AMAZEEN audit finding #2), a `pagehide` flush, and `navigator.storage.persist()` requested after the first meaningful write.
- **Multiple tabs:** BroadcastChannel change events with per-change dirty flags (AMAZEEN audit finding #4).
- **Backups:** vault-level export as an **encrypted** archive by default (`.eternall`, decryptable with the recovery key), plus an optional plaintext JSON export per imprint for portability, with an explicit warning.

## 8. Testing and quality gates

| Layer | Tooling | Gate |
|---|---|---|
| Domain (core, vault, each imprint's `domain/`) | Vitest, property tests for time math (as AMAZEEN's ISO-week test), crypto tests with known vectors | 100% of exported functions covered by at least one test |
| Components | Vitest + Testing Library (jsdom), `fake-indexeddb` | Critical flows per imprint |
| E2E | Playwright: Chromium, WebKit, mobile emulation; **each door tested in isolation** + cross-imprint journeys | Green on every PR |
| Accessibility | axe on every screen, light and dark, plus reduced-motion runs | Zero violations |
| Visual | Playwright screenshot comparisons of each imprint's signature layouts (2D) | Reviewed diffs only |
| Performance | Bundle-size check script against `DESIGN.md` §7 budgets; Lighthouse CI on house + one imprint per PR | Budgets green |
| Lint and types | oxlint (deny warnings), `tsc -b` | Clean |
| Palettes | the CVD/contrast validator run on every theme's tokens | Pass |

## 9. Internationalisation

Copy lives in `modules/<id>/messages/<locale>.ts` and `apps/web/messages/<locale>.ts`, which are typed catalogues with ICU-style plurals via `Intl.PluralRules`. Dates and numbers use `Intl` with the active locale (today both apps fix `en`). v1 ships English, and the structure is ready for Indonesian.

## 10. Migration of existing code

**ETERNALL (this repo):**

| Today | Goes to |
|---|---|
| `src/domain/time.ts`, `types.ts` (shared parts), `validation.ts` helpers | `packages/core` |
| `src/domain/lifeline.ts`, `stats.ts` (time measures) | `apps/web` (house) + `modules/almanack/domain` |
| `src/domain/capsule.ts`, `features/capsules`, `features/editors/Capsule*` | `modules/envoi` |
| `features/chapters`, `ChapterEditor` | `modules/folio` |
| `features/almanac` | `modules/almanack` |
| `features/archive`, `InscriptionEditor` (inscriptions) | the house's own lightweight inscriptions → see `MODULES.md` §2 |
| `components/ui/*` | `packages/ui` (stripped of visual styles) |
| `store/persistence.ts` (localStorage) | replaced by `packages/vault`; a one-time import migrates `eternall:archive` |

**AMAZEEN** (`~/orca/amazeen-app`, never modified in place):
- Imported with `git subtree add --prefix=modules/amazeen <amazeen-repo> main`, keeping its 43-commit history (ADR 0006).
- `src/sync/crypto.ts`, `keyphrase.ts`, `engine.ts`, `records.ts`, `src/domain/idb.ts` and `storage.ts` (mirror and adapter logic) are **lifted into `packages/vault`** and generalised. `modules/amazeen` keeps its domain (`issues.ts`, `layout.ts`, `search.ts`, `types.ts`) and features.
- `worker/` and `migrations/` become the base of `services/sync-worker`.
- AMAZEEN's own spine is retired in favour of the shared spine (`design/amazeen.md` §6).

## 11. Native readiness (Capacitor, later)

To wrap the PWA later without rewriting:
- All platform access goes through small adapters in the shell (`ctx.vault` storage, `ctx.net`, `ctx.notify` for local reminders, `ctx.share`, `ctx.files` for export). The web implementations ship now, and Capacitor implementations are added later.
- Web Crypto is used in both (available in Capacitor's WKWebView/Android WebView). WebAuthn PRF availability differs, so the lock-method UI is capability-driven.
- No reliance on browser-only behaviours in domain code. Service-worker features degrade gracefully inside native shells.

## 12. Security baseline (details in `PRIVACY.md`)

- **Strict CSP** (no inline scripts, `default-src 'self'`, fonts self-hosted, `connect-src 'self'`), HSTS, `no-store` API responses, and the AMAZEEN `public/_headers` approach.
- **No third-party scripts, analytics or CDNs at runtime.**
- **Input validation** at every boundary: imprint schemas on write, `readArchive`-style validation on import, and strict wire validation in the Worker.
- **Rate limiting and quotas** on the Worker (as AMAZEEN's README prescribes).
