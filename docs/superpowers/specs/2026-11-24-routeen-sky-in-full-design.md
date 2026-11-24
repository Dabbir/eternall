# ROUTEEN — the sky in full (UI upgrade)

Status: design, awaiting the owner's approval · Date: 2026-11-24 · Builds on ADR 0015 (Langit Hari) and amends its §4 (front-page sections) · Design doc to update: `docs/design/routeen.md`

## 1. Why

The owner is not satisfied with ROUTEEN's interface. They named three problems:

1. **The sky sits in a box.** On Today it is a rounded gradient card. The sun arc is small and on the left, half the card is empty, and in dark mode the gradient reads as muddy brown-grey.
2. **Chips jump when tapped.** There are two causes:
   - `frontPage` moves a lit practice from *Not yet today* into *For now* (`marked(p) ||` in `front.ts`).
   - The tier buttons (◐ ✺) appear inline after the lit chip, pushing the chips that follow onto another line.
3. **The concept does not feel real.** Lighting a practice changes a pill's colour; the sky itself never changes. The Sky page's year reads as a GitHub contribution grid, and its practices are plain underlined links.

The goal is that opening ROUTEEN feels like looking at *today's sky*. Every practice has its own place in it, and lighting one visibly lights the sky, while marking stays one tap, fast and accessible.

## 2. Goals, non-goals, anti-goals

**Goals**
- The sky is the page, full width, with no card around it.
- Every practice is a body in the sky at a place that never moves. Lighting it changes that body in place.
- The sky grows brighter as the day fills. This is never shown as a number.
- Nothing on the page moves when something is tapped.
- The Sky page, a day's page and a practice's page speak the same language.

**Non-goals**
- No new data and no change to marking rules, tiers, modes, the 03:00 day end or house contributions.
- No new dependency, no 3D on Today, and no change to the dome.

**Anti-goals** (a failure even if it works)
- Marking becomes slower or less clear than one tap.
- Colour alone carries meaning.
- Anything streak-like, a percentage, red, or "missed".
- A layout that shifts under the finger.
- A pretty sky that is unreadable in dark mode or on a phone.

## 3. Approaches considered

- **A. A full sky where each practice has its place** (chosen by the owner). The sky spans the page, each practice is a body at its time-of-day spot, and a stable list below does the tapping.
- **B. The sky as the only place to tap.** The most literal, but small touch targets on a phone, colliding labels, and an awkward keyboard path. Rejected.
- **C. A light fix.** Remove the box, fix the order and tidy the chips. Fast, but it leaves "the concept doesn't feel real" unanswered. Rejected.

## 4. Today (`/routeen/`)

### 4.1 Layout
```
┌ app bar (background = the sky's top colour, no rule below) ──────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░ the sky, edge to edge ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ Tuesday midday                                                        [☀︎ Normal ▾]   │
│                  ◯ Stretch    ☀ (now)                                                 │
│      ◐ Meditate                        ◯ Drink water           ◯ Read                 │
│  ☀ Morning run                                                        ◯ Journal       │
│─────────────────────────────── horizon ──────────────────────────────────────────────│
└──────────────────────────────────────────────────────────────────────────────────────┘
  Morning                                   (now)
  [◐] Morning run       ·  30 minutes       ◐  ☀︎  ✺
  [◐] Meditate                              ◐  ☀︎  ✺
  Midday                                    ← "now" marker on the current part
  [◯] Stretch                               ◐  ☀︎  ✺
  Evening
  [◯] Read · Journal …
  Any time
  [◯] Drink water                           ◐  ☀︎  ✺
  Also today (not due)
  …
  Yesterday: 2 not marked →
```

### 4.2 The sky band
- **Full bleed.**
  - The band breaks out of the 1040px column to the viewport's full width.
  - The app bar's background becomes `--sky-top` on ROUTEEN pages and drops its gradient rule, so the bar and the sky are one surface.
  - The page body below is `--paper`. The horizon line is where the sky meets the paper.
- **Height:** about `clamp(240px, 34vh, 360px)`.
- **Headline and mode:** the headline ("Tuesday midday") sits top left in the sky, and the mode button top right, as today.
- **The arc:** a wide arc spans the whole band, horizon to horizon. It is drawn as one SVG that scales with the band (`preserveAspectRatio` so bodies stay round).
- **The sun now:** the real sun stands at the current time on the arc (`sunPosition`), drawn larger than practice bodies, with a soft glow. It is the only body with a glow when nothing is lit.
- **Practice bodies:** each active practice listed on Today (due, plus Also today) is a body on the sky.
  - **x** is its time-of-day zone: morning in the left third, midday in the middle third, evening in the right third. *Any time* practices are spread across the whole width on a lower orbit.
  - **Within a zone**, bodies are spread evenly in the list order (§4.3). They alternate between two orbits, the arc itself and a lower one, so neighbours never overlap.
  - **The same practice always lands on the same spot** for the same set of practices. Lighting never moves anything.
- **A body's look:**
  - **Unlit:** an empty ring in `--ink-2`.
  - **Minimum ◐:** a half disc.
  - **Target ☀︎:** a full disc.
  - **More ✺:** a disc with rays.
  - Shapes are drawn as SVG paths, not font glyphs, so they stay crisp at any size. The fill is `--accent`, and lit bodies get a soft accent halo.
  - **Day off:** all bodies are small stars ✦ in `--ink-2`. If one is lit, it shows its tier shape.
- **Labels:**
  - At ≥ 600px wide and ≤ 12 practices on the sky, each body has its name under it (`--ink`, small, ellipsised at about 16 characters).
  - Otherwise bodies have no labels, and the list below names them.
  - Labels never overlap: bodies on the lower orbit put their label above.
- **Brightness:**
  - The gradient is mixed between a dim version and the full sky according to `glow` = lit due practices / due practices (0 when nothing is due). Not shown anywhere as a number.
  - The dim version is the sky mixed 55% toward `--paper`. Mixing toward paper only raises contrast with `--ink`, so words stay readable at every step. look.test already checks the full ends.
  - The change crossfades over 320ms; under reduced motion it is instant.
- **Weather:**
  - *Low energy* lays soft clouds over the **whole band**.
  - *Day off* turns the band into a quiet night with points of light.
  - These are the existing overlays, enlarged to full bleed.
- **Lighting moment, "Lit":**
  - When a row is tapped and the sky band is in view, the body itself plays the moment in place: it rises a few pixels, the halo blooms and it settles (≤ 700ms, ease-out, once).
  - When the band is scrolled out of view (a phone with a long list), the existing house ceremony `Lit` plays instead, so the payoff is never lost.
  - Under reduced motion neither plays; the body simply changes.
- **For screen readers:** the sky is one `role="img"` with a label in words ("Today's sky: 2 of 6 lit"), from `copy.ts`. The bodies are not focusable. The list is the only interactive path.

### 4.3 The list (replaces the chips)
- **Groups:** practices are grouped by **time of day, in a fixed order**: Morning · Midday · Evening · Any time, then **Also today** (active but not due), then nothing else.
  - The current part's group has a small "now" marker next to its heading. The groups themselves never reorder.
  - This replaces *For now · Not yet today* (ADR 0015 §4). The fixed order is what stops things moving.
  - Empty groups are not shown. A group can only appear or disappear when the part of day or the practice set changes, never on a tap.
- **Order within a group:** start date, then name (as today).
- **A row (one per practice)** is a full-width line with three parts:
  1. **The main button:** body shape + name + measure hint (for example "30 minutes"). Tapping it lights at the mode's tier (`tapTier`). Tapping a lit row unlights it, with a toast and **Undo** as now.
  2. **Three tier buttons (◐ ☀︎ ✺), always present,** each at least 44×44.
     - Tapping one lights at exactly that tier; tapping the current tier unlights.
     - The current tier is filled (`aria-pressed`). The others are quiet outlines.
     - Accessible names: "Run, a little · 10 minutes" and so on.
     - Because they are always there, nothing appears or disappears on tap. This also makes "a little" one tap instead of two.
  3. **Width:** the row is the same width lit or not.
- **Evening recap (from 17:00):**
  - Same groups and rows.
  - **All as planned** (Low energy: **All, a little**) sits at the head of the list as one button. It is hidden, not removed, once nothing is left for it, using `visibility` so the list below does not jump.
- **Day off:**
  - A line under the headline: "A day off, and nothing asked of it. Light anything if you feel like it."
  - Then the same groups. Rows are quieter (no "now" marker, no bulk button).
- **Back to Normal?** and **Yesterday: N not marked →** stay, as now. *Back to Normal?* sits between the sky and the list.
- **Empty and resting** states stay. The empty state shows the empty sky band with only the sun and the one-field form below.

### 4.4 Phone (≤ 600px)
- The sky band is about 220px, with bodies but no labels. The headline is in the sky and the mode button sits under the headline.
- Rows are full width: name on the left, the three tier buttons on the right.
- When the name is long it wraps, and the tier buttons keep their place.

## 5. The Sky (`/routeen/sky`)
- **Header:** the same full-bleed band as Today, shorter (about 180px), with the title "The sky" and the caption "N days lit this year". No bodies or sun.
- **This week:** seven **small skies** (rounded 6px tiles with the sky gradient, dimmed when unlit and full when lit), each with its tier shape as SVG, ☁︎/✦ for the mode, and today outlined. Earlier, Later and Back to this week stay.
- **The year:** keeps 52 weeks × 7 days with month labels (ADR 0015), but is drawn as **one SVG night strip** instead of grey squares:
  - a dark band (`--ink` at low alpha over `--paper`, or the dark sky in dark mode);
  - each day a point: unlit expected days are a faint 1px ring, plain days are nothing, days off a tiny ✦, and lit days their tier shape in the accent, sized by tier;
  - today ringed.

  It stays a `role="table"` for screen readers (cells as now, with the same spoken labels), and sideways scrolling on a phone, opening at today. The dome toggle is unchanged.
- **Practices:** rows, not links. Each row shows the body shape of its time of day (dawn, sun or dusk mark), the name in the display font, "lit N days" and *paused*, as a whole-row link to its page. There are no underlines; hover and focus show a row background.
- **Your sky's look** and **Your day** are unchanged in content. The look sample becomes a tiny sky band with the three bodies.

## 6. A day (`/routeen/day/<date>`) and a practice (`/routeen/practice/<id>`)
- **A day:**
  - The same full-bleed band, at that day's mode and brightness (the same `glow`), with the day's bodies placed as on Today, without the "now" sun.
  - Below: the same rows as Today, each with its state in words under the name ("lit, a little", "not lit", "day off", "not expected"). *That day:* mode picker and the way back stay.
- **A practice:** a shorter band (about 160px) with this practice's body at its time-of-day spot, then the facts, the year of weekly tiles (the small-sky tiles from §5) and the actions, as now.

## 7. Palette (dark skies)
- Dark skies get richer, clearer gradients instead of brown-grey. Proposed starting points, to be tuned against `look.test`:
  - **Fajar:** `#3b2a35` → `#1d2a3f`
  - **Siang:** `#1c3554` → `#12233a`
  - **Senja:** `#4a2f3a` → `#2a2148`
  - **Malam:** `#141c33` → `#0b1020`
- Ink on both ends stays ≥ 7:1 (body) and ≥ 4.5:1 (ink-2), and the accent on the sky ≥ 3:1 for the bodies (a graphical object). A new test case is added for the bodies' accent on both sky ends.
- Light skies keep their values.

## 8. Motion (all of it skipped under reduced motion)
- In-place Lit ≤ 700ms.
- Brightness crossfade 320ms.
- Weather crossfade 320ms (as now).
- Row and tier colours 160ms.
- Nothing loops; the sun does not move live (it updates when the page re-renders on the routine's clock, as now).

## 9. What changes in code
- **`front.ts`:** `frontPage` returns `groups: { part: 'morning'|'midday'|'evening'|'anytime'; practices: Practice[] }[]` in the fixed order plus `alsoToday`, `ifYouLike` and `glow`. `forNow` and `notYet` are removed, with their tests rewritten. `allAsPlanned` covers every due, unmarked, non-*times* practice in the recap.
- **New pure `skyPlacement.ts`:** `placeBodies(practices, width-agnostic) → { id, x (0–1), y (0–1), orbit, labelSide }[]`, with tests:
  - stable for the same input;
  - no two bodies closer than a minimum distance;
  - the zone respected.
- **New components:** `SkyBand` (band, arc, sun, bodies, weather, the brightness and the in-place Lit) and `PracticeRow` (replacing `Chip`). `Tile` is redrawn as a small sky with SVG shapes. The year becomes one `YearStrip` SVG with the table semantics kept.
- **CSS:** `routeen.css` is rewritten for the band, rows, tiles and year. In `routeen.kit.css` the app bar takes the sky's top colour.
- **Copy:** `copy.ts` gains the part group names, the sky's spoken label, the day-off line and the tier button names.
- **Docs:**
  - a new short **ADR 0016**, "ROUTEEN's sky in full", amending ADR 0015 §4: groups by time of day, tiers always shown, the sky as the page;
  - `docs/design/routeen.md` §4–§9 updated;
  - `ROADMAP.md` gets a line.

## 10. Verification
- Typecheck, lint, tests (new placement and front tests, existing ones updated) and the build budgets are green.
- **Browser:** Today, Sky, a day and a practice at 390, 768 and 1440px, light and dark, under all four skies, in Normal, Low energy and Day off, with reduced motion.
  - The hit test finds no covered controls and no horizontal scroll.
  - Tapping every row and tier moves nothing on the page (no element's position changes).
  - Keyboard path: every row and tier is reachable, focus is visible, and the sky is skipped.

## 11. Left to the builder
- The exact orbit radii, the label font size and the halo size.
- The tuned dark-sky hexes, within the contrast tests.
- How the year strip draws its month bands.
- Whether the in-place moment uses CSS keyframes or the Web Animations API (no library).
