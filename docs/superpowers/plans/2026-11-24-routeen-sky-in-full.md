# ROUTEEN — the sky in full: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ROUTEEN's sky becomes the page:
- a full-bleed band where every practice is a body at a fixed place, lighting in place;
- a stable list below, grouped by time of day, with the tiers always shown;
- the Sky, day and practice pages in the same language.

**Architecture:**
- Pure placement and grouping live in `modules/routeen/src/` with tests.
- The React components `SkyBand`, `Body`, `PracticeRow` and `YearStrip` live in `modules/routeen/src/app/`.
- CSS is rewritten in `theme/routeen.css`; the app bar takes the sky colour in `theme/routeen.kit.css`.
- No data or rule changes.

**Tech Stack:** React 19, TypeScript strict, Vitest + Testing Library, plain CSS, inline SVG.

**Spec:** `docs/superpowers/specs/2026-11-24-routeen-sky-in-full-design.md`

## Global Constraints
- No new dependency. No data path changes. Records stay under `refrain/*`.
- Every UI string lives in `modules/routeen/src/copy.ts`.
- Shapes carry the meaning (◐ half disc, ☀︎ full disc, ✺ rayed disc, ✦ star, ring = unlit). Colour only supports them. Never red, "missed", streaks or percentages.
- Words on the sky are only `--ink` and `--ink-2`.
- Every control is ≥ 44×44 with a visible focus. The sky band is `role="img"` and its bodies are not focusable.
- All motion sits inside `@media (prefers-reduced-motion: no-preference)`. Lit is ≤ 700ms, the brightness crossfade 320ms, row colours 160ms.
- Looks change tokens only, never layout. Use small caps (`font-variant-caps`), never `text-transform: uppercase`.
- Commit per task on `platform`, never push. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
- **Tapping a row or tier moves nothing:** no element on Today changes its bounding box (Task 5 test: positions before and after a tap are equal).
- **Many practices (15+) or long names:** bodies never overlap and labels hide above 12 bodies (Task 2 placement test with 15 bodies; label rule in Task 4).
- **A practice added mid-day lands in its own zone** without shifting other zones' bodies (Task 2 test: adding an evening practice leaves the morning bodies' x unchanged).
- **Dark mode under every sky:** ink on both sky ends ≥ 4.5:1 and accent on both sky ends ≥ 3:1 (Task 8 test).
- **Screen readers and the keyboard:** sky skipped, each tier button named "a little · Morning run" (unique), rows reachable in order (Task 5 tests by role and name).

---

### Task 1: Front page groups and glow (domain)

**Files:**
- Modify: `modules/routeen/src/front.ts`
- Test: `modules/routeen/src/front.test.ts`

**Interfaces:**
- Produces:
  - `type Group = { time: TimeOfDay; practices: Practice[] }`;
  - `FrontPage.groups: Group[]`: due practices, in the order morning, midday, evening, anytime; empty groups left out; on a Day off it holds **every active practice**;
  - `FrontPage.alsoToday: Practice[]` (unchanged meaning, `[]` on a Day off);
  - `FrontPage.glow: number`: 0..1, `markedDueCount / dueCount`, 0 when `dueCount === 0`.
- Keeps: `forNow`, `notYet` and `ifYouLike` stay until Task 5 removes them.

- [ ] **Step 1: Write failing tests** in `front.test.ts`:
  - `groups due practices by time of day in a fixed order`: with `input()` at 08:00, expect `groups.map(g => [g.time, g.practices.map(p => p.id)])` to equal `[['morning',['water']],['evening',['med']],['anytime',['run','read']]]`.
  - `keeps the groups whatever is lit`: the same expectation with marks on `med` and `run` today.
  - `puts every active practice in the groups on a Day off`: groups flatten to `['water','med','run','mum','read']` in group order, and `alsoToday` is `[]`.
  - `glows with the share of due practices lit`: `glow` is 0 with no marks, 0.5 with marks on `run` and `med`, and 0 on a Day off.
- [ ] **Step 2: Run** `npx vitest run modules/routeen/src/front.test.ts`. Expected: FAIL (`groups` undefined).
- [ ] **Step 3: Implement** in `frontPage`. The source is `due`, or `active` on a Day off. Bucket it by `timeOf(p)` in `TIMES = ['morning','midday','evening','anytime']`, sort each bucket with `ordered`, and drop empty buckets.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `routeen: group the front page by time of day, add its glow`.

### Task 2: Sky placement (domain)

**Files:**
- Create: `modules/routeen/src/placement.ts`
- Test: `modules/routeen/src/placement.test.ts`

**Interfaces:**
- Produces:
  - `type Placed = { id: string; x: number; y: number; labelAbove: boolean }`. `x` and `y` are in 0..1 of the band; `y` is 0 at the top and 1 at the horizon.
  - `placeBodies(groups: readonly { time: TimeOfDay; practices: readonly { id: string }[] }[]): Placed[]`
  - `arcY(x: number): number`, the arc's height at x: `1 - 0.78 * sin(π * x')`, where `x' = (x - 0.04) / 0.92` clamped to 0..1.
  - `MIN_GAP = 0.06`

**Placement rules:**
- **Zones:** morning x ∈ [0.06, 0.33], midday [0.36, 0.64], evening [0.67, 0.94].
- **n bodies in a zone:** x is evenly spread, `lo + (hi - lo) * (i + 0.5) / n`.
- **Orbits:** even `i` sits on the arc (`y = arcY(x)`), odd `i` on the lower orbit (`y = arcY(x) + 0.16`, capped at 0.86).
- **Anytime:** spread over [0.06, 0.94] on the low orbit, `y = 0.8`.
- **Labels:** `labelAbove` is true for lower-orbit and anytime bodies.

- [ ] **Step 1: Write failing tests:**
  - `places each zone in its third`: morning x < 0.34, midday 0.35 < x < 0.65, evening x > 0.66.
  - `is stable`: the same input gives a deep-equal output.
  - `keeps bodies apart`: 15 practices (5 morning, 5 evening, 5 anytime) → every pair has Euclidean distance ≥ `MIN_GAP`.
  - `adding an evening practice leaves the morning bodies where they were`.
  - `arcY` is ≈ 0.22 at x = 0.5 and 1 at x = 0.04.
- [ ] **Step 2: Run** `npx vitest run modules/routeen/src/placement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `placement.ts` per the rules above.
- [ ] **Step 4: Run.** Expected: PASS. If the 15-body gap test fails, widen the lower-orbit offset rather than lowering `MIN_GAP`.
- [ ] **Step 5: Commit** `routeen: place each practice in the sky by time of day`.

### Task 3: Shapes as SVG (`Body`) and the small-sky tile

**Files:**
- Create: `modules/routeen/src/app/Body.tsx`
- Modify: `modules/routeen/src/app/Tile.tsx`, `modules/routeen/src/theme/routeen.css` (tile rules)
- Test: `modules/routeen/src/app/Body.test.tsx`

**Interfaces:**
- Produces:
  - `type BodyKind = 'unlit' | 'minimum' | 'target' | 'more' | 'rest' | 'sun'`
  - `function BodyShape({ kind, r }: { kind: BodyKind; r: number }): JSX.Element` returns SVG `<g>` content centred at 0,0:
    - `unlit`: a ring;
    - `minimum`: a ring plus a left half-disc path;
    - `target`: a full disc;
    - `more`: a disc plus 8 rays;
    - `rest`: a four-point star;
    - `sun`: a disc with class `rs-body--sun`.
  - `function BodyIcon({ kind, size = 20 }: …)`: an inline `<svg aria-hidden="true" viewBox="-12 -12 24 24">` wrapping `BodyShape` (used in rows and tiles).
  - `Tile` keeps its props and spoken label. Inside, it renders `BodyIcon` (tier, or rest) instead of the glyph text, plus the mode glyph `☁︎` for low. Its class `rs-tile` becomes a small sky: a sky gradient, dimmed when unlit or plain (CSS).

- [ ] **Step 1: Write failing tests:**
  - `draws a distinct shape for each kind`: render `BodyIcon` for each kind and check the rendered markup differs pairwise (`container.innerHTML`). `more` has 8 `line` elements; `minimum` has a `path`.
- [ ] **Step 2: Run** `npx vitest run modules/routeen/src/app/Body.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `Body.tsx` and update `Tile.tsx`.** Fill `currentColor` for target/more/minimum's half; stroke `currentColor` for rings. Tile CSS:
  - `.rs-tile` background `linear-gradient(var(--sky-top), var(--sky-bottom))`;
  - `--unlit` and `--plain`: `filter: saturate(0.3)` plus a `color-mix` toward `--paper` 60%;
  - `--rest`: background `var(--ink-2)` with the star in `--paper`;
  - `--future`: transparent with a dashed `--rule` outline;
  - lit tiles: body colour `--accent`, plus a halo `box-shadow: 0 0 0 1px var(--accent-text)` for `more`.
- [ ] **Step 4: Run** the Body test and `npx vitest run apps/web/src/test/release2.test.tsx`. Expected: PASS (tile labels unchanged).
- [ ] **Step 5: Commit** `routeen: draw the sky's shapes as SVG, tiles as small skies`.

### Task 4: The sky band

**Files:**
- Create: `modules/routeen/src/app/SkyBand.tsx`
- Modify: `modules/routeen/src/copy.ts`, `modules/routeen/src/theme/routeen.css`, `modules/routeen/src/theme/routeen.kit.css`; delete `modules/routeen/src/app/SunArc.tsx` once Today uses the band (Task 5).
- Test: `modules/routeen/src/app/SkyBand.test.tsx`

**Interfaces:**
- Consumes: `placeBodies`, `arcY` (Task 2); `BodyShape` (Task 3).
- Produces:
  ```ts
  function SkyBand(props: {
    size: 'full' | 'short' | 'small';        // full ≈ clamp(240px,34vh,360px), short ≈ 180px, small ≈ 160px
    mode: Mode;                               // weather overlays
    glow: number;                             // 0..1 → CSS var --glow
    groups?: readonly Group[];                // bodies; omitted on the Sky page header
    kindOf?(id: string): BodyKind;            // lit tier / unlit / rest per body
    nameOf?(id: string): string;
    sun?: number;                             // sunPosition; omitted = no "now" sun
    label: string;                            // the band's role="img" name
    justLit?: string | null;                  // id of the body to play Lit in place
    children?: ReactNode;                     // headline, mode button (rendered above the SVG, not inside role=img)
  }): JSX.Element
  ```
- Copy to add:
  - `sky.band(lit, due)`: "Today's sky: N of M lit", or "Today's sky: nothing due" when due is 0;
  - `sky.bandDay(date, lit, due)`, for a day's page;
  - `sky.bandPractice(name)`.

**Behaviour:**
- **Full bleed:** the band is `<section class="rs-band rs-band--{size} rs-mode--{mode}">`, with `margin-inline: calc(50% - 50vw)` and `width: 100vw`. Guard against horizontal scroll with `overflow-x: clip` on `.rc-body`.
- **Brightness:** the background is `linear-gradient(color-mix(in srgb, var(--sky-top) calc(45% + 55% * var(--glow)), var(--paper)), color-mix(… --sky-bottom …))`.
- **The SVG:** one `<svg role="img" aria-label={label}>` with `viewBox="0 0 1000 400"` and `preserveAspectRatio="none"`, containing the arc path and the horizon. Bodies are drawn in a second, absolutely positioned layer of `<span>`s placed by `left: x*100%`, `top: y*100%`, each with an inline `<svg>` `BodyIcon`, so bodies stay round. The layer is `aria-hidden`.
- **Labels:** shown only when the band is ≥ 600px wide (CSS `@container`) and there are ≤ 12 bodies; `labelAbove` flips the side. Ellipsis at `max-width: 16ch`.
- **The sun:** at `sun`, `x = 0.04 + 0.92 * sun`, `y = arcY(x)`, `BodyKind 'sun'`, larger, with a soft glow.
- **`justLit`:** the body gets class `is-lighting` for 700ms, with keyframes `rs-body-light` (translateY(6px) scale(.6) → translateY(-4px) scale(1.15) → none, and a halo bloom). CSS only, inside the no-preference media query.
- **App bar:** in `routeen.kit.css`, `--appbar-bg: color-mix(in srgb, var(--sky-top) calc(45% + 55% * var(--glow, 1)), var(--paper))`. Remove the gradient `border-image`. `--glow` is set on `.rc` by Today; other pages use 1.

- [ ] **Step 1: Write failing tests:**
  - `names the sky in words and hides its bodies`: the band has `role="img"` with name `copy.sky.band(1, 3)`, and the body layer has `aria-hidden="true"`.
  - `draws one body per practice, in its kind`: each body has `data-kind`.
  - `marks the just-lit body`: it has the class `is-lighting`.
- [ ] **Step 2: Run** `npx vitest run modules/routeen/src/app/SkyBand.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `SkyBand.tsx`, the copy and the CSS above. Move the existing weather overlays (`::before` clouds, `::after` stars) from `.rs-head` to `.rs-band`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `routeen: the sky band, full width with every practice in it`.

### Task 5: Today on the band, with stable rows

**Files:**
- Create: `modules/routeen/src/app/PracticeRow.tsx`
- Modify: `modules/routeen/src/app/Today.tsx`, `modules/routeen/src/front.ts` (remove `forNow`, `notYet`, `ifYouLike`; `allAsPlanned` reads `groups`), `front.test.ts`, `copy.ts`, `routeen.css`, `apps/web/src/test/release2.test.tsx`
- Delete: `modules/routeen/src/app/Chip.tsx`, `SunArc.tsx`, `.rs-chip*`/`.rs-arc*` CSS

**Interfaces:**
- Consumes: `FrontPage.groups`, `glow` (Task 1); `SkyBand` (Task 4); `BodyIcon` (Task 3).
- Produces:
  ```ts
  function PracticeRow(props: { practice: Practice; date: ISODate; routine: Routine; note?: string; onTap(): void; onTier(t: Tier): void }): JSX.Element
  ```
  - **Main button:** name `/^<name>/`, `aria-pressed` = lit.
  - **Three tier buttons, always rendered:** accessible name `copy.aria.tierFor(tier, name, hint)`, giving "a little · Morning run · 10 minutes"; `aria-pressed` when it is the current tier. Tapping the current tier unlights it.
- Copy:
  - `now: 'now'` (the marker next to the current part's group heading);
  - `dayOffLine: 'A day off, and nothing asked of it. Light anything if you feel like it.'`;
  - `aria.tierFor`.
  - Remove `forNow`, `notYet`, `ifYouLike`.

**Behaviour:**
- `Today` renders, in order:
  1. a `SkyBand` (`full`, with the sun) containing the headline and `ModeControl`;
  2. the offer;
  3. the day-off line;
  4. the bulk button, in the recap only, kept in the layout with `visibility: hidden` once `bulk` is empty;
  5. the groups in order, each with an `h2` of `copy.times[time]` plus a `now` marker when `time === page.part` and the mode isn't off;
  6. `alsoToday`;
  7. yesterday.
- **Tap:** `justLit` is set to the practice's id for 700ms. Lit plays through `house.ceremony` only when the band is out of view: an `IntersectionObserver` on the band keeps `inView`. The ceremony stays skipped under reduced motion, by the shell.
- **Row layout:** `display: grid; grid-template-columns: minmax(0,1fr) auto`. The tiers are a fixed 3×44px group, so a row's height and width never depend on its state.

- [ ] **Step 1: Update `front.test.ts`.** Replace the `forNow`/`notYet`/`ifYouLike` expectations with `groups` (the same cases from Task 1), and keep the `allAsPlanned` expectations unchanged.
- [ ] **Step 2: Update and add `release2.test.tsx` cases:**
  - **Change:** the "inline choice" test clicks `copy.aria.tierFor('minimum', 'Morning run', null)` instead of `copy.tiers.minimum`.
  - **New:** `lights at a tier in one tap from the row`. Clicking the "a little · Morning run" button writes a mark with `tier: 'minimum'`.
  - **New:** `moves nothing when a practice is lit`. Record `getBoundingClientRect()`-independent order (list items' `textContent` in order), plus `data-kind` counts. After a click on "Morning run", the list items' order and count are unchanged. jsdom has no layout; the pixel check is in Task 9's browser step.
  - **New:** `groups practices by time of day`. Seed a morning and an evening ritual; the headings `Morning` and `Evening` appear in that order.
- [ ] **Step 3: Run** `npx vitest run modules/routeen apps/web/src/test/release2.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement** `PracticeRow`, the new `Today`, and the `front.ts` removals. Delete `Chip.tsx`, `SunArc.tsx` and their CSS.
- [ ] **Step 5: Run** `npm run typecheck && npx vitest run modules/routeen apps/web`. Expected: PASS.
- [ ] **Step 6: Commit** `routeen: Today under a full sky, rows that never move`.

### Task 6: The Sky page

**Files:**
- Create: `modules/routeen/src/app/YearStrip.tsx`
- Modify: `modules/routeen/src/app/Sky.tsx`, `routeen.css`, `copy.ts`
- Test: `apps/web/src/test/release2.test.tsx` (existing sky tests keep passing; one added)

**Interfaces:**
- Consumes: `SkyBand` (`short`, no groups), `Tile` (Task 3), `BodyShape`.
- Produces: `function YearStrip({ year, today }: { year: DaySky[][]; today: ISODate }): JSX.Element`.
  - It keeps `role="table"` with label `copy.aria.skyGrid`, one `role="row"` per week with a `rowheader` (month or hidden week name), and one `role="cell"` per day holding an `<svg role="img" aria-label={spoken label}>` of 14px.
  - **Kinds:** `unlit` is a faint ring, `plain` an empty cell, `rest` a tiny star, a lit day its tier shape in `--accent`, `future` a dot.
  - **Band:** the background is `color-mix(in srgb, var(--ink) 6%, var(--paper))` in light, the sky-bottom mix in dark.
  - It scrolls sideways and opens at today, as before (the `yearBox` callback ref moves into it).
- Practices list:
  - each practice is a whole-row `Go` link containing `BodyIcon` (`sun`-like time mark from `timeOf`), the name in `--font-display`, `copy.sky.litDays(n)` and *paused*;
  - no underline; hover and focus get a `--paper-raised` background.
- Copy: `sky.litDays(n)` = `plural(n, 'day') + ' lit'`.

- [ ] **Step 1: Add a test** `lists each practice as a row with its lit days`. On `/routeen/sky` with one mark, the link named `/^Morning run/` contains "1 day lit".
- [ ] **Step 2: Run** `npx vitest run apps/web/src/test/release2.test.tsx`. Expected: the new test FAILS and the others pass.
- [ ] **Step 3: Implement** `YearStrip`, the band header, and the practice rows. The week strip keeps its markup and uses the new `Tile`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `routeen: the Sky page under the band, the year as a night strip`.

### Task 7: A day and a practice

**Files:**
- Modify: `modules/routeen/src/app/DayPage.tsx`, `PracticePage.tsx`, `routeen.css`

**Interfaces:**
- Consumes: `SkyBand`, `PracticeRow`, `placeBodies` via the band's `groups`.
- **DayPage:**
  - a `SkyBand` of size `full`, without `sun`. Its groups are the day's list bucketed by `timeOf`, using a local `groupByTime(list)` helper exported from `front.ts` and reused by Task 1's implementation. `glow` = lit / (lit + unlit + open among that day's states).
  - The band contains the eyebrow and the title.
  - Rows are `PracticeRow` with `note = copy.dayState[state]`.
- **PracticePage:** a `SkyBand` of size `small` with one group holding this practice, and `glow` 1. The title and why sit in the band.
- Produces: `export function groupByTime(ps: readonly Practice[]): Group[]` in `front.ts`, plus a test in `front.test.ts`: `groups any list by time of day`.

- [ ] **Step 1: Write the `groupByTime` test.** Run it. Expected: FAIL.
- [ ] **Step 2: Implement** `groupByTime` (refactor Task 1 to use it), then the two pages.
- [ ] **Step 3: Run** `npm run typecheck && npx vitest run modules/routeen apps/web/src/test/release2.test.tsx`. Expected: PASS, including the existing day and practice tests.
- [ ] **Step 4: Commit** `routeen: a day and a practice under their own sky`.

### Task 8: Clearer dark skies

**Files:**
- Modify: `modules/routeen/src/look.ts`, `modules/routeen/src/theme/routeen.css` (the default Fajar dark tokens), `modules/routeen/src/look.test.ts`

- [ ] **Step 1: Add a test** `keeps every accent visible as a body on both ends of every sky`. For each preset × mode × accent, `contrast(accent[mode][0], sky end) >= 3`.
- [ ] **Step 2: Run** `npx vitest run modules/routeen/src/look.test.ts`. Expected: FAIL for the current dark skies if any fall short; otherwise it passes and only the values change.
- [ ] **Step 3: Set the dark sky ends.** Starting points:
  - Fajar `#3b2a35`/`#1d2a3f`
  - Siang `#1c3554`/`#12233a`
  - Senja `#4a2f3a`/`#2a2148`
  - Malam `#141c33`/`#0b1020`
  
  Tune until every look test passes. Mirror Fajar dark in `routeen.css`.
- [ ] **Step 4: Run** `npx vitest run modules/routeen`. Expected: PASS.
- [ ] **Step 5: Commit** `routeen: clearer dark skies, bodies checked against them`.

### Task 9: Docs and browser verification

**Files:**
- Create: `docs/adr/0016-routeen-sky-in-full.md`. It amends ADR 0015 §4: groups by time of day, tiers always shown, the sky band as the page, and in-place Lit.
- Modify:
  - `docs/design/routeen.md` §4, §5.1–5.4, §6, §8 and §12;
  - `docs/adr/README.md` (index);
  - `docs/ROADMAP.md` (one line);
  - `CLAUDE.md` and `AGENTS.md` (the ROUTEEN bullet: "For now · Not yet today · Also today" → "groups by time of day under a full sky"), kept identical.

- [ ] **Step 1: Write the docs.**
- [ ] **Step 2: Run** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: all green, budgets within limits.
- [ ] **Step 3: Check in the browser** on the second dev server (port 5182, test vault):
  - Today, Sky, a day and a practice at 1440, 768 and 390;
  - light and dark, under all four skies;
  - Normal, Low energy and Day off;
  - with reduced motion.

  The hit test finds no covered controls and no horizontal scroll. Every row's and tier's `getBoundingClientRect()` is the same before and after a tap (measured with `orca eval`).
- [ ] **Step 4: Commit** `docs: ROUTEEN's sky in full (ADR 0016)`.
