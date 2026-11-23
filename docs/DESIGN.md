# ETERNALL — Design

Status: accepted, amended by ADR 0011 · Related: `BRAND.md`, `design/*`, `ARCHITECTURE.md`

> **One publishing house, many publications.**
> Every app is designed as if it were a different printed object made by a different studio, and all of them are bound by the same standards and the same respect for the person reading. Since ADR 0011, each app is also its own site: no house spine, no house name, no shared look. The house keeps its own look on its own pages.

---

## 1. The principle: bold on the surface, clear in the hand

Two demands that sound opposed and are both non-negotiable:

1. **Bold.** Each imprint must be unmistakable, crafted and anti-mainstream. Its layout, spacing, typography, colour and motion come from its own metaphor, not from a shared template. Someone who sees a screenshot should know which imprint it is without reading a word.
2. **Clear.** Each imprint must be immediately understandable. A first-time visitor knows what the screen is and what they can do within five seconds, using words they'd use themselves.

Every design is reviewed against both. Boldness is never an excuse for confusion, and clarity is never an excuse for blandness.

### 1.1 Each imprint has its own system of space

There is **no global spacing scale shared by imprints**. Each imprint derives its grid, margins and rhythm from the printed object it borrows from, and its design doc must justify the system in one paragraph.

| Imprint | Spatial system | Derived from |
|---|---|---|
| ETERNALL | One-page ledger: the week grid is the centrepiece; generous atlas margins; thin labels in the gutters; decade gaps break rhythm | an atlas plate, a ledger page |
| AMAZEEN | Magazine grid with a baseline; asymmetric columns; display type allowed to break columns | magazine layout (existing system) |
| AMAZEEN · Letters (once ENVOI) | An asymmetric writing desk: envelopes stacked at angles on open surface; one focal letter at a time; in AMAZEEN's inks | a desk, correspondence |
| House · Chapters (once FOLIO) | Shelf rows of spines by decade; an opened chapter on Van de Graaf proportions; in the house's type | classical book design |
| House · Almanac (once ALMANACK) | Dense two-column tables with hairline rules; information in layers (figure, unit, note); in the house's type | printed almanacs, ephemerides |
| REFRAIN | The five-line staff: vertical rhythm = staff spacing; horizontal rhythm = beats (7 per bar, one per day) | engraved sheet music |
| KINDRED | Fixed modules in business-card ratio (85:55), arranged like drawers of a card file; generous card padding | address books, letterpress cards |
| MARGINALIA | A text column plus a wide margin column (≈ 2:1), where notes and highlights live in the margin | an annotated book page |
| CASHEEN | The ruled page: one row per 2.25rem ruling; a narrow date column, particulars, then money columns behind a double red rule | an accountant's ledger |

### 1.2 Forbidden patterns (checked in every review)

If a design contains any of these, it is sent back:

- A centred hero with three feature cards, uniform card grids, or icons inside circles.
- Generic purple/blue gradients, glassmorphism, neon glows, or heavy drop shadows everywhere.
- The default look of any UI library (shadcn, Material, Bootstrap, Chakra) or a generic KPI dashboard.
- One uniform 8px spacing scale applied without a reason from the imprint's metaphor.
- Stock illustration, decorative blobs, or 3D that carries no data or meaning.
- Skeuomorphism that hurts reading: fake paper textures under body text, low-contrast "aged" ink, or handwriting fonts for long text.
- Charts used as decoration (see `§8`).

### 1.3 Clarity guardrails (never broken)

- **Metaphor in visuals, plain words in actions.** Button labels use everyday verbs ("Write a letter", "New chapter", "Mark as done"). Imprint names always carry their function line (`BRAND.md` §4).
- **Predictable locations, within each app.** Each app's own chrome (§2) puts *where am I*, *the way back to the house*, *search*, *the lock* and *the primary action* in one fixed place on every screen of that app. In the house, the house spine does the same.
- **One focus per screen** and **one primary action** that is visually dominant. Decoration never competes with content for attention.
- **Standard interactions stay standard.** Links look like links, buttons look pressable, forms follow platform conventions, focus is always visible. Every 3D gesture has a click or keyboard equivalent. A 3D scene never traps the page: a plain wheel or vertical swipe over it scrolls the page, and zoom needs Ctrl/⌘ + wheel or a pinch (`letPageScroll` in `packages/stage`, applied to every `OrbitControls`). The same holds for CSS 3D views (MARGINALIA's cabinet riffles cards with a sideways swipe, not the wheel), and closing any dialog always hands the page its scroll back.
- **Guided first contact.** The first time an imprint opens, a single short, skippable moment explains its metaphor ("Each book on this shelf is a chapter of your life."). It is never shown again after it is dismissed.
- **Comprehension tests**, documented in each `design/<imprint>.md`:
  - *5-second test:* for every key screen, a first-time viewer can answer "what is this, and what can I do here?"
  - *3-task test:* three core tasks per imprint can be completed without help.

## 2. Chrome: the house spine, and each app's own

**The house spine** appears on house pages only: the lifeline, inscriptions, chapters, almanac, settings and onboarding. It is ink-black in both themes. It has a 52px band across the top on desktop and a 60px band at the bottom on mobile, with the house mark (opens the doors menu), search, the page's primary action, the lock and settings.

**Each app draws its own chrome, on one shared set of positions (ADR 0013).** The kit's headless `AppBar` (`packages/kit/src/appbar.tsx`; structure in `packages/ui/src/ui.css`) decides **where** things are and how they behave; each app's `modules/<id>/src/app/Chrome.tsx` passes its ornaments, and its `theme/<id>.kit.css` decides **how they look** through the class hooks `.appbar`, `__exit`, `__title`, `__name`, `__fn`, `__places`, `__place`, `__extra`, `__tools`, `__tool`, `__primary`, `__dot`. AMAZEEN keeps its own `AppShell` and mirrors the same positions inside ETERNALL.

```
wide (≥ 820px)   [← Back]  NAME  fn      place · place · place      [extra]  ⌕  🔒  [+ Action]
phone            [←]           NAME                                          ⌕  🔒
                 place     place     place                                     (+)   ← fixed bottom bar
```

| App | Way back | Name | Places | Primary action | Its own ornament |
|---|---|---|---|---|---|
| AMAZEEN | "Leave" | monogram + masthead on the ink-black band | 01 Desk · 02 Shelf · 03 Letters · 04 Office | Write (vermilion) | the press deadline as `extra`; on its own (no ETERNALL) it keeps its left spine |
| CASHEEN | the clasp, "Close the book" | spaced Caslon over a double rule | The month · Budget · Your words | Add an entry (focuses the quick line) | the thumb index sits in the page under the month: twelve half-moon notches |
| REFRAIN | "Fine" with the end barline | spaced Bodoni | I. The score (a ritual's notes are movement II, named under the bar) | Mark today, a marking | five staff hairlines run under the bar |
| KINDRED | "Close the drawer" | the brass label plate | Card file · Constellation, as drawer fronts with brass pulls; the open one pulled out | Add a person, a letterpress block | the carcass of the cabinet on the phone's bottom bar |
| MARGINALIA | the ribbon bookmark, "Back to the stacks" | the catalogue card, call number typed | Catalogue · Every underline, pencilled; the current one ringed by hand | Add a work, typed in brackets | the oak desk |

**Behavioural invariants for every app's chrome:**
- the same place, in every app, for the way back, the name, the places, search (⌘K), the lock (⌘⇧L) and the primary action
- 44px touch targets; a visible label on the way back, or an accessible name ("…, back to ETERNALL") where a phone hides it
- on phones the places and the raised primary action are a fixed bottom bar; `--appbar-bottom` lifts the page and the toasts clear of it. Nothing an app adds to the bar may set `position`, `transform` or `filter` on `.appbar` or its children in a way that breaks the fixed bottom bar
- keyboard paths throughout, and reduced motion respected
- the app's first-contact note (kit `IntroNote`) sits under its chrome, never above it
- the places are a `nav` landmark of ordinary links; the app's in-page controls (CASHEEN's month notches) are not navigation chrome

The chrome reads its behaviour from the kit (`House.leave`, `lock`, `canLock`, `openSearch`, `notices`, `primaryAction`).

## 3. Moving between the house and the apps

Opening an app is opening another site, and it should feel like it.

- **A clean cut.** Crossing between the house and an app, or between apps, swaps the whole page with no shared transition, and the page starts at the top. Moves between house pages keep a gentle view transition, and moves inside an app are the app's own business.
- **The browser changes too.** The tab title, tab icon, theme colour and manifest switch to the app's own (`ImprintDefinition.brand`; `apps/web/src/shell/doorHead.ts`). Browser Back returns.
- **Theme scope.** Themes switch by setting `data-imprint="<id>"` on `<body>`, so the app's tokens reach the page background, dialogs and toasts. Colours never "flash" through the house theme.

## 4. Accessibility standards (all imprints, both themes)

- **WCAG 2.1 AA** minimum, with automated axe checks on every screen in CI (`ARCHITECTURE.md` §8).
- **Contrast:** body text ≥ 7:1 where the palette allows (all current palettes do), secondary text ≥ 4.5:1, accent text ≥ 4.5:1, UI boundaries ≥ 3:1. Every palette in `design/*` lists its measured ratios.
- **Colour is never the only carrier of meaning.** Categorical palettes are validated with the CVD validator (OKLab ΔE; adjacent pairs ≥ 8 target, 6–8 only with secondary encoding). Every coloured mark also has a label, shape or pattern.
- **Keyboard:** everything is reachable, focus is always visible (2px accent outline, 3px offset), dialogs trap focus (native `<dialog>`), and canvases and 3D scenes expose a parallel DOM structure with arrow-key navigation and live-region announcements (the pattern proven in the current lifeline canvas).
- **Motion:** `prefers-reduced-motion` turns all choreography into fades, and 3D scenes into their 2D equivalents (§6).
- **Text:** body text ≥ 16px at default zoom; layouts survive 200% zoom and 320px width without horizontal scroll; handwriting or display faces are never used for paragraphs.
- **Audio** (REFRAIN) never autoplays, and always has a visual equivalent and a visible stop control.

## 5. Motion

Each imprint has its own **signature motion vocabulary** (`design/*`), but all of it obeys the same physics:

| Rule | Value |
|---|---|
| Durations | micro 120ms · small 220ms · medium 420ms · large (ceremonies) 800–2000ms |
| Default easing | `cubic-bezier(0.22, 1, 0.36, 1)` (out); springs only for small, playful feedback |
| Ceremonies | At most one per action (sealing, pressing an issue, closing an act). Always skippable after the first 400ms. |
| Purpose | Every animation must explain a change (where something came from or went, what happened). Ambient looping animation is forbidden except for "now" indicators. |
| Performance | Animate only `transform` and `opacity` in the DOM; canvas and WebGL animations render on demand, never in an idle loop. |

### 5.1 Ceremonies: one full-screen moment per app

AMAZEEN's "Filed" stamp set the pattern. Every app and the house mark their most meaningful save with one full-screen moment in their own idiom, through the kit's `House.ceremony(node, ms)`.

**Rules (enforced by the shell, `apps/web/src/shell/Shell.tsx`):**
- **The data is written first.** The moment is decoration and nothing waits on it.
- **Never in the way.** It never blocks input (`pointer-events: none`), and it is hidden from assistive tech; the toast says what happened.
- **Never under reduced motion.** It is not mounted at all.
- **Short.** At most 900ms (600ms for CASHEEN, which is used many times a day). One plays at a time; a new one replaces the last.
- **Always on top.** It lives in the browser's top layer (a manual popover), so it shows above an open dialog, like a stamp landing on whatever is on the desk.
- **Fading out.** Each veil keeps `opacity: 1` until its last frames, so the moment never washes out early.

| Where | When | The moment |
|---|---|---|
| AMAZEEN | a piece is filed | "Filed": a red stamp slammed onto the page (its own, unchanged) |
| AMAZEEN · Letters | a letter is sealed | "Sealed": hot wax spreads, the seal comes down with the letter's fingerprint ring, "Sealed until <date>" |
| REFRAIN | a ritual is marked kept | "A held note": five hairlines draw across, the ritual's note drops onto its pitch under a fermata; when every ritual due today is kept, the final double bar and "Fine" |
| KINDRED | "I saw them today", a new card | "Letterpress strike": the name presses into card stock with a ring of ink |
| MARGINALIA | a new underline · a new work | "The sweep": the line set large, a highlighter drawn under it, a pencil tick · "Filed": a catalogue card drops into its lettered drawer |
| CASHEEN | an entry (or several, or an import) | "Entered": the sum written digit by digit, ruled off with a double line in red pen (green for money in); the cursor stays in the quick line |
| House | a new inscription · a new chapter | "Carved": the title cut letter by letter and sealed with the house's dot · "Shelved": the chapter's book slides onto a plank in its cloth |

## 6. 3D, WebGL and audio

ETERNALL uses three-dimensional and sonic moments where they **carry meaning**: a life as a coil of weeks, a letter physically sealed, a shelf of chapters, the turning of seasons in an orrery, a week of rituals as a melody.

**Rules:**

1. **Progressive enhancement, never progressive degradation.** Every 3D or audio experience has a complete 2D equivalent that offers *the same information and actions*. The 2D version is designed first, and 3D is layered on top of it.
2. **Capability-gated** by `packages/stage` (`ARCHITECTURE.md` §6). 3D runs only when WebGL2 is available, the device isn't in power-save or low-memory mode, `prefers-reduced-motion` is off, and the person hasn't chosen "Flat pages" in settings.
3. **Lazy and isolated.** three.js and scene code load only when a 3D moment is entered, never on first paint. Each imprint's 3D code is its own chunk.
4. **On-demand rendering.** Scenes render on interaction or animation frames only, and stop when idle or when the tab is hidden.
5. **Procedural, not downloaded.** Envelopes, books, coils and orreries are generated in code with modest geometry, so there are no large model files. Textures are small, generated or vector.
6. **Accessible.** Every 3D scene has a parallel DOM layer (focusable items, labels, live-region announcements) and full keyboard control (arrows to move, Enter to open, Esc to leave 3D).
7. **Budgets** (§7) apply, and a scene that misses its frame budget on the reference device downgrades itself to 2D automatically.
8. **Paid immersive modes** (`BUSINESS.md` §2) are 3D modes only. The 2D experience, including each imprint's signature moment in 2D, is always free and always complete.

## 7. Performance budgets (enforced in CI)

| Metric | Budget |
|---|---|
| Shell entry JS incl. React (gzip) | ≤ 100 KB (Phase 1: 89.6 KB) |
| Each imprint's initial chunk (gzip, excluding 3D) | ≤ 90 KB |
| Each 3D chunk (gzip, including the three.js share) | ≤ 220 KB, loaded only on demand |
| Fonts per imprint | ≤ 3 families, woff2, Latin subset, ≤ 120 KB total; `font-display: swap` with metric-matched fallbacks |
| LCP (mid-range laptop, cold) | < 2.5s |
| INP | < 200ms |
| CLS | < 0.05 |
| 3D frame time (reference: 2021 mid-range laptop, integrated GPU) | ≤ 16.7ms sustained; auto-downgrade to 2D after 2s above 33ms while animating (`?nobudget` disables this in development only) |

Fonts are **self-hosted** (via `@fontsource`, as AMAZEEN does today) to keep the strict CSP. No third-party font CDNs.

## 8. States and charts

**Every screen designs four states:** loading, empty, success and error. Each imprint styles them in its own language (`design/*`), following shared rules:
- **Loading:** show the shape of what is coming in the imprint's idiom (spines on a shelf, envelope outlines). No generic spinners on canvases. Under 300ms, show nothing.
- **Empty:** explain what the space is for, in one sentence, with one action. Never guilt.
- **Error:** what happened, what to do, and a way out. Never lose a person's writing. Drafts persist through errors.
- **Success:** confirm briefly (toast or in-place change). Ceremonies are reserved for meaningful moments.

**Charts** follow the data-visualisation method used for the current Almanac:
- Form follows the data's job.
- Categorical colours come in a fixed order from a validated palette, with a legend whenever there are ≥ 2 series.
- One axis only; thin marks; a hover/focus tooltip; a table view.
- Text is set in text colours, never in series colours.

Each imprint may *style* charts in its own idiom (ALMANACK engraves them, REFRAIN writes them on a staff), but the rules above hold.

## 9. Shared colour semantics

Palettes are owned by imprints, and only these meanings are shared:

| Token | Meaning | Rule |
|---|---|---|
| `--seal` | the house: ETERNALL's vermilion seal | Appears on house pages only (the house mark, house focus rings); never inside an app (ADR 0011) |
| `--focus` | focus ring | Each app sets it to its accent in its kit stylesheet; it must reach 3:1 against the app's paper |
| `--danger` | destructive actions | Each imprint sets it; it must be distinguishable from its accent by more than hue alone (label + icon) |
| `--spine-*` | the house spine | Ink-black band, paper-coloured text, on house pages only |

The **tones** palette (joy, calm, tender, bold, grief, wonder) is shared data, since an inscription's tone is the same in every imprint. Its validated values (light and dark) live in `design/eternall.md`, and imprints render tones with them.

## 10. Theme mechanics

- Each imprint ships `modules/<imprint>/theme/theme.css`, scoped to `[data-imprint="<imprint>"]`, defining its tokens for light and dark (`[data-theme]` + `prefers-color-scheme`, the pattern already used in ETERNALL and AMAZEEN).
- Theme CSS and fonts are **lazy-loaded with the app's chunk**. The theme is scoped on `<body data-imprint>` while the app is open, so it reaches dialogs and toasts.
- `packages/ui` primitives read their shape from tokens with the house's values as fallbacks. Each app sets them in `modules/<id>/src/theme/<id>.kit.css`, adding scoped selectors where a token isn't enough:

| Group | Tokens (fallback = the house's value) |
|---|---|
| Buttons | `--btn-radius`, `--btn-h`, `--btn-h-s`, `--btn-pad`, `--btn-font`, `--btn-weight`, `--btn-size`, `--btn-style`, `--btn-tracking`, `--btn-caps`, `--btn-press`, `--btn-primary-bg/fg/border/hover`, `--btn-accent-shadow`, `--icon-btn-radius` |
| Fields and labels | `--field-radius`, `--field-h`, `--field-pad`, `--field-bg`, `--field-font`, `--field-focus`, `--label-font/size/weight/tracking/caps` |
| Dialogs | `--dialog-radius`, `--dialog-bg`, `--dialog-shadow`, `--dialog-title-font/size/style/tracking/caps`, `--dialog-foot-rule`, `--dialog-foot-bg`, `--veil-blur` |
| Toasts | `--toast-radius`, `--toast-bg`, `--toast-fg`, `--toast-border`, `--toast-font`, `--toast-size`, `--toast-pad`, `--toast-shadow`, `--toast-dot` |
| Choices | `--seg-radius/bg/thumb/thumb-shadow/font/size/tracking/caps/on`, `--toggle-radius/bg/on-bg/on-fg/font/size/tracking/caps` |
| Page | `--focus`, `--selection`, `--on-selection` |

- **Small caps, not uppercase.** Use `font-variant-caps: all-small-caps` (the `--*-caps` tokens), never `text-transform: uppercase`. Chromium exposes transformed text to assistive tech in capitals; small caps keep the real words.
- Light and dark exist for every imprint. Some imprints have a **named** dark mode (AMAZEEN's "Night edition", ALMANACK's "Night sky", PROLOGUE's "House lights down").
- Print stylesheets exist where there is printable output (AMAZEEN issues and letters, chapter summaries, the almanac's yearly sheet, the recovery kit).

## 11. Design review checklist

Used on every screen, in every imprint, before it ships:

- [ ] Unmistakably this app (screenshot test without a logo), and no resemblance to ETERNALL or another app: no house spine, mark, name, pill buttons, house dialog or toast?
- [ ] None of the forbidden patterns (§1.2)?
- [ ] Spatial system follows the imprint's doc, with no stray generic spacing?
- [ ] 5-second test passes; the primary action is obvious and plainly worded?
- [ ] The app's chrome sits on the shared `AppBar` positions (ADR 0013): way back, name, places, search, lock and primary action, with accessible names, at 390, 768 and 1440? (`shell.test.tsx` › one app bar)
- [ ] All four states designed (loading, empty, success, error)?
- [ ] Contrast and CVD validated; keyboard and screen reader paths work?
- [ ] Reduced-motion and 2D fallback complete and equivalent?
- [ ] Within performance budgets?
- [ ] Works at 320px, 768px and 1440px, and in both themes?

## 12. Imprint design docs

| Imprint | Doc |
|---|---|
| ETERNALL (house: lifeline, inscriptions, chapters, almanac) | `design/eternall.md` |
| AMAZEEN (with Letters) | `design/amazeen.md` |
| REFRAIN | `design/refrain.md` |
| KINDRED | `design/kindred.md` |
| MARGINALIA | `design/marginalia.md` |
| CASHEEN | `design/casheen.md` |
| Retired: ENVOI, FOLIO, ALMANACK, PROLOGUE | `design/archive/*.md` (their systems live on in Letters, Chapters and the Almanac) |
