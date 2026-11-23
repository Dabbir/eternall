# ETERNALL — Design

Status: draft for review · Phase 0 · Related: `BRAND.md`, `design/*`, `ARCHITECTURE.md`

> **One publishing house, many publications.**
> Every imprint is designed as if it were a different printed object made by a different studio, and all of them are bound by the same spine, the same standards and the same respect for the person reading.

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
| ENVOI | An asymmetric writing desk: envelopes stacked at angles on open surface; no rigid columns; one focal letter at a time | a desk, correspondence |
| FOLIO | Van de Graaf canon page proportions (2:3 page, inner margin ½ of outer, bottom margin 2× top); shelf rows of spines | classical book design |
| ALMANACK | Dense two-column tables with tight leading and hairline rules; information in layers (figure, unit, note) | printed almanacs, ephemerides |
| REFRAIN | The five-line staff: vertical rhythm = staff spacing; horizontal rhythm = beats (7 per bar, one per day) | engraved sheet music |
| PROLOGUE | A proscenium frame: content centred in an arch, with "wings" left and right for supporting notes | a theatre stage, a playbill |
| KINDRED | Fixed modules in business-card ratio (85:55), arranged like drawers of a card file; generous card padding | address books, letterpress cards |
| MARGINALIA | A text column plus a wide margin column (≈ 2:1), where notes and highlights live in the margin | an annotated book page |

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
- **Predictable locations.** The spine (§2) puts *where am I*, *go elsewhere*, *search* and *the primary action* in the same place in every imprint, however different the canvas is.
- **One focus per screen** and **one primary action** that is visually dominant. Decoration never competes with content for attention.
- **Standard interactions stay standard.** Links look like links, buttons look pressable, forms follow platform conventions, focus is always visible. Every 3D gesture has a click or keyboard equivalent. A 3D scene never traps the page: a plain wheel or vertical swipe over it scrolls the page, and zoom needs Ctrl/⌘ + wheel or a pinch (`letPageScroll` in `packages/stage`, applied to every `OrbitControls`).
- **Guided first contact.** The first time an imprint opens, a single short, skippable moment explains its metaphor ("Each book on this shelf is a chapter of your life."). It is never shown again after it is dismissed.
- **Comprehension tests**, documented in each `design/<imprint>.md`:
  - *5-second test:* for every key screen, a first-time viewer can answer "what is this, and what can I do here?"
  - *3-task test:* three core tasks per imprint can be completed without help.

## 2. The shared spine

The spine is the only UI that is identical across imprints. It is the binding that holds the publications together. It is deliberately small, neutral and **ink-black in both themes** (as in AMAZEEN today), so each imprint's colour owns the page.

```
Desktop (≥ 820px): a 52px band across the top
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [◖L•] ENVOI · Letters to your future        ⌘K Search         [ Write a letter ] 🔒 ⚙ │
└────────────────────────────────────────────────────────────────────────────────────┘
  house mark   imprint name + function       search            primary action  lock settings
  (opens the doors menu)                                        (imprint-provided label)

Mobile (< 820px): a 60px band at the bottom (thumb zone), plus safe-area inset
┌──────────────────────────────────────────┐
│  [◖L•]      ⌕       [ ✎ Write ]      ☰    │
└──────────────────────────────────────────┘
```

- **House mark** opens the **doors menu**, the list of imprints (name + function), with "Your lifeline" at the top when the dashboard is enabled.
- **Focus mode** (an imprint used on its own, or installed as its own PWA) collapses the spine to the house mark, the search and the primary action. Nothing about the platform is pushed on the person.
- **Primary action** is supplied by the imprint (`ARCHITECTURE.md` §3) and always lives in the same spot.
- **Lock** is visible whenever the vault has a lock method (`PRIVACY.md` §4).
- **⌘K / Ctrl+K** opens the command palette, which is shared and searches across all enabled imprints.

Imprints may add their own secondary navigation **inside their canvas**, styled in their own language (FOLIO's shelf tabs, AMAZEEN's page rail), but never duplicate the spine's functions.

## 3. Moving between imprints

Changing imprint is changing publication, and it should feel like it.

- **View Transitions API** with a two-part transition: the outgoing imprint's canvas *closes* in its own idiom (pages settle, an envelope folds, a curtain lowers) and the incoming one *opens* in its own idiom. The spine stays still, which is what makes the change legible.
- Duration ≤ 700ms total, and interruptible. Under `prefers-reduced-motion` it becomes a 150ms cross-fade.
- Themes switch by setting `data-imprint="<id>"` on the canvas root (§10). Colours never "flash" through the default theme.

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
| `--seal` | the house: ETERNALL's vermilion seal | Appears in the spine's house mark in every imprint, and never used by an imprint for anything else |
| `--focus` | focus ring | Each imprint sets it to its accent; it must reach 3:1 against the imprint's paper |
| `--danger` | destructive actions | Each imprint sets it; it must be distinguishable from its accent by more than hue alone (label + icon) |
| `--spine-*` | the spine | Ink-black band, paper-coloured text, identical everywhere |

The **tones** palette (joy, calm, tender, bold, grief, wonder) is shared data, since an inscription's tone is the same in every imprint. Its validated values (light and dark) live in `design/eternall.md`, and imprints render tones with them.

## 10. Theme mechanics

- Each imprint ships `modules/<imprint>/theme/theme.css`, scoped to `[data-imprint="<imprint>"]`, defining its tokens for light and dark (`[data-theme]` + `prefers-color-scheme`, the pattern already used in ETERNALL and AMAZEEN).
- Theme CSS and fonts are **lazy-loaded with the imprint's chunk**; the spine's CSS is the only global CSS.
- `packages/ui` holds **behavioural primitives** (Dialog, Field, Toast, Segmented, Menu), styled only through CSS custom properties and `data-*` hooks, so each imprint skins them completely.
- Light and dark exist for every imprint. Some imprints have a **named** dark mode (AMAZEEN's "Night edition", ALMANACK's "Night sky", PROLOGUE's "House lights down").
- Print stylesheets exist for imprints with printable output (AMAZEEN issues, ENVOI letters, FOLIO chapter summaries, ALMANACK yearly sheet, recovery kit).

## 11. Design review checklist

Used on every screen, in every imprint, before it ships:

- [ ] Unmistakably this imprint (screenshot test without a logo)?
- [ ] None of the forbidden patterns (§1.2)?
- [ ] Spatial system follows the imprint's doc, with no stray generic spacing?
- [ ] 5-second test passes; the primary action is obvious and plainly worded?
- [ ] Spine present and correct; focus mode works?
- [ ] All four states designed (loading, empty, success, error)?
- [ ] Contrast and CVD validated; keyboard and screen reader paths work?
- [ ] Reduced-motion and 2D fallback complete and equivalent?
- [ ] Within performance budgets?
- [ ] Works at 320px, 768px and 1440px, and in both themes?

## 12. Imprint design docs

| Imprint | Doc |
|---|---|
| ETERNALL (house, lifeline) | `design/eternall.md` |
| AMAZEEN | `design/amazeen.md` |
| ENVOI | `design/envoi.md` |
| FOLIO | `design/folio.md` |
| ALMANACK | `design/almanack.md` |
| REFRAIN | `design/refrain.md` |
| PROLOGUE | `design/prologue.md` |
| KINDRED | `design/kindred.md` |
| MARGINALIA | `design/marginalia.md` |
