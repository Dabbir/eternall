# ALMANACK — Design

Status: draft for review · Measures & reflections · Replaces "Almanac" in the current ETERNALL app

## 1. Metaphor
**An antique almanac and an astronomer's ephemeris.** A small, dense, beloved book of tables: sunrises and moons, seasons and tides, red-letter days, and an engraved frontispiece of the heavens. ALMANACK measures a life the way an almanac measures a year: precisely, gently, without judgement.

*Moodboard in words:* foxed paper; sepia-black letterpress; engraved line art of orbits and moon phases; Prussian-blue plates; red-letter rubrics for notable days; tight tables with hairline rules; Latin-ish headers translated into plain English.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` | `#ece4d0` | `#0e1220` | — |
| `--ink` (sepia-black) | `#241b12` | `#e6dcc4` | 13.36 / 13.68 |
| `--ink-2` | `#5a4a36` | `#a9a08b` | 6.72 / 7.18 |
| `--ink-3` | `#6c5c47` | `#8e8673` | 5.09 / 5.16 |
| `--accent` (Prussian blue; actions, plates) | `#1f3d6b` | `#9db4e8` | 8.55 / 8.99 |
| `--accent-2` (rubric red; red-letter days) | `#a3341f` | `#f07d5f` | 5.40 / 6.93 |
| `--on-accent` | `#f4eedf` | `#0b1020` | 9.36 / 9.13 on accent |

Named dark mode: **Night sky**. The paper becomes a deep celestial navy and the engraved lines glow faintly, like a star chart.

## 3. Typography
- **Display and headers:** IM Fell English (and IM Fell English SC for small caps), the historic Fell types, with authentic irregularity used only at large sizes.
- **Tables and figures:** Spectral, with lining tabular figures enabled (`font-variant-numeric: lining-nums tabular-nums`) for every table.
- **Notes:** Spectral italic.
- OFL, self-hosted.

## 4. Space and grid
**Dense tables, layered information.**
- **Two-column almanac page** (on screens ≥ 960px): columns of equal width with a 1px hairline column rule and a 28px gutter. Below that, one column.
- **Tight leading** in tables (1.25), generous leading in prose (1.6). There are **three information layers** per figure: the figure (large Spectral, `--ink`), the unit (small caps, `--ink-2`) and a note (italic, `--ink-3`), stacked with 2px and 6px gaps.
- **Hairline rules** (0.5px at 2× DPR) separate rows. There are no cards and no boxes, only rules and white space.
- **Plates:** full-width engraved figures (the orrery, moon calendar) interrupt the columns, with a caption below in small caps, numbered like book plates ("Plate I").

*Why:* almanacs pack a year into a pocket book, and the density *is* the charm. Layered type keeps it readable.

## 5. Key screens

### 5.1 The almanack for this year of your life
```
┌ spine: [◖L•] ALMANACK · Measures & reflections     ⌘K        [ Reflect on this week ] ┐
   THE ALMANACK                                  for the 35th year of MIRA's life
   ─────────────────────────────────────────────────────────────────────────────
   PLATE I · The Orrery of Your Years            (engraved orrery, 38.2% of horizon)
   ─────────────────────────────────────────────────────────────────────────────
   OF TIME LIVED                        │  OF TIME AHEAD
   Weeks .................. 1,786       │  Weeks .................. 2,894
   Sunrises .............. 12,546       │  Summers ................... 56
   Full moons ................ 424      │  Weekends ............... 2,903
   Seasons turned ............ 137      │  (a horizon, not a prophecy)
   ─────────────────────────────────────┼───────────────────────────────────
   ECHOES · week 19 of earlier years    │  THE WEATHER OF MEMORY
   1 yr ago  Walked Dad around…  ● 2025 │  joy ████  calm ██  tender ███ …
   3 yrs ago Storm over the Tagus ● 2023│  (table view ▸)
   ─────────────────────────────────────┴───────────────────────────────────
   RED-LETTER DAYS AHEAD   ⟡ 3 Sep 2030 a letter opens (ENVOI) · ⟡ 40th birthday …
```
- Every figure in ALMANACK comes from imprint contributions via `almanacFacts()` (`ARCHITECTURE.md` §3) plus the house's own time measures (the existing `computeAlmanac`).

### 5.2 Year sheet (printable)
A single page per year of life, laid out like an almanac's year page: twelve months as engraved micro-calendars, red-letter days in rubric, and the year's measures. It is designed for print (`@page` A4/Letter).

## 6. Signature moment
- **2D (free):** *the engraved orrery.* An SVG frontispiece with engraved line style (hatched, no fills). The sun is at the centre; your current year is a planet on its orbit, with the moon's phase shown for today. Concentric orbits mark decades lived (solid) and ahead (dotted). Its arms animate to the present on open.
- **3D (immersive):** *the mechanical orrery.* A brass-and-enamel procedural orrery (cylinders, tori and gears with a matcap brass material). Turning a crank or scrubbing the timeline rotates the mechanism through your life: gears mesh, the "year" planet orbits, the moon rotates through its phases, and a dial shows summers remaining. Selecting a year stops the mechanism and opens that year's sheet.
  - *Accessibility:* a slider ("Year of life") with value text, which drives both the 2D and 3D versions.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Open | orrery arms sweep from 0 to the present | 1200ms |
| Figures | numbers count up once, ease-out, lining figures (no width jitter) | 800ms |
| Table row focus | hairline below the row thickens to 1.5px in accent | 120ms |
| Plate scrub | gears rotate, continuous with the input (no autoplay) | input-driven |

## 8. Components unique to ALMANACK
Almanac table (dot leaders, three-layer figure) · plate (numbered figure + caption) · engraved orrery (SVG) / mechanical orrery (3D) · echoes list · weather-of-memory chart (engraved bar style + table view) · red-letter day list · printable year sheet.

## 9. States
- **Loading:** table rules drawn with dot leaders and figures replaced by `—`.
- **Empty (few contributions):** time measures always exist (from the lifeline profile, or from first use if there is no profile). Sections without data show an italic note: *"Echoes appear here once you've kept a few weeks."*
- **No lifeline profile:** ALMANACK still works standalone, measuring from the date you started using ETERNALL, and offers *"Add your birth date to measure your whole life"*.

## 10. Mobile
Single column; plates scale to width; dot-leader tables keep the figure right-aligned; the year sheet is replaced by a scrollable month list (print is still available).

## 11. Clarity checks
- **Forbidden patterns:** none. This is explicitly *not* a KPI dashboard: no tiles, no deltas, no green/red performance colours. Rubric red marks dates only, never "bad" values.
- **5-second test:** *"This shows my time measured in different ways, and what's coming up."*
- **3 tasks:**
  1. Find how many summers remain on your horizon.
  2. See what you wrote in this same week in earlier years.
  3. Print this year's sheet.
